const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');
const cheerio = require('cheerio');

const templatesDir = path.join(__dirname, 'templates');

async function generateThumbnail(htmlFilePath, outputPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({width: 800, height: 800, deviceScaleFactor: 0});
    await page.goto(`file://${htmlFilePath}`);
    await page.screenshot({ path: outputPath, fullPage: false });
    await browser.close();

    // Resize the image to ensure it's exactly 300x300
    await sharp(outputPath)
        .resize(300, 300, { fit: 'cover' })
        .toFile(outputPath.replace('.png', '_resized.png'));

    // Replace the original screenshot with the resized one
    await fs.rename(outputPath.replace('.png', '_resized.png'), outputPath);
}

async function extractTemplateMetadata(htmlFilePath) {
    const htmlContent = await fs.readFile(htmlFilePath, 'utf-8');
    const $ = cheerio.load(htmlContent);
    const metaTag = $('meta[name="template-meta"]');
    
    return {
        name: metaTag.attr('template-name'),
        tag: metaTag.attr('template-tag'),
        description: metaTag.attr('description')
    };
}

async function generateTemplatesJson() {
    const templates = [];
    const allTags = new Set();
    const files = await fs.readdir(templatesDir);

    for (const file of files) {
        if (path.extname(file) === '.html') {
            const htmlFilePath = path.join(templatesDir, file);
            const thumbnailPath = path.join(templatesDir, `${path.basename(file, '.html')}.png`);
            const metadata = await extractTemplateMetadata(htmlFilePath);

            // Check if thumbnail already exists
            try {
                await fs.access(thumbnailPath);
                console.log(`Thumbnail already exists for ${file}, skipping...`);
            } catch (error) {
                // Thumbnail doesn't exist, generate it
                console.log(`Generating thumbnail for ${file}...`);
                await generateThumbnail(htmlFilePath, thumbnailPath);
                console.log(`Thumbnail generated for ${file}`);
            }

            const tags = metadata.tag.split(',').map(tag => tag.trim());
            tags.forEach(tag => allTags.add(tag));

            templates.push({
                name: metadata.name,
                description: metadata.description,
                tags: tags,
                thumbnailUrl: `templates/${path.basename(file, '.html')}.png`
            });
        }
    }

    const templatesData = {
        templates: templates,
        allTags: Array.from(allTags)
    };

    // Write the generated content to templates.json
    await fs.writeFile('templates.json', JSON.stringify(templatesData, null, 2));
    console.log('templates.json generated successfully');
}

async function init() {
    try {
        await generateTemplatesJson();
    } catch (error) {
        console.error('Error initializing:', error);
    }
}

init();
