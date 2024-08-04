const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const templatesDir = path.join(__dirname, 'templates');

async function generateThumbnail(htmlFilePath, outputPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 700, height: 300 });
    await page.goto(`file://${htmlFilePath}`);
    await page.screenshot({ path: outputPath, fullPage: false });
    await browser.close();

    // Resize the image to ensure it's exactly 700x300
    await sharp(outputPath)
        .resize(700, 300, { fit: 'cover' })
        .toFile(outputPath.replace('.png', '_resized.png'));

    await fs.unlink(outputPath);
    await fs.rename(outputPath.replace('.png', '_resized.png'), outputPath);
}

async function traverseTemplates() {
    try {
        const files = await fs.readdir(templatesDir);
        const templateData = [];

        for (const file of files) {
            if (path.extname(file) === '.html') {
                const htmlFilePath = path.join(templatesDir, file);
                const thumbnailPath = path.join(templatesDir, `${path.basename(file, '.html')}.png`);
                const content = await fs.readFile(htmlFilePath, 'utf8');
                const $ = cheerio.load(content);

                const templateInfo = {
                    name: path.basename(file, '.html'),
                    title: $('title').text(),
                    h1: $('h1').first().text(),
                    firstParagraph: $('p').first().text(),
                };

                // Check if thumbnail already exists
                try {
                    await fs.access(thumbnailPath);
                    console.log(`Thumbnail already exists for ${file}`);
                } catch (error) {
                    // Thumbnail doesn't exist, generate it
                    console.log(`Generating thumbnail for ${file}`);
                    await generateThumbnail(htmlFilePath, thumbnailPath);
                }

                templateData.push(templateInfo);

                console.log(`File: ${file}`);
                console.log(`Name: ${templateInfo.name}`);
                console.log(`Title: ${templateInfo.title}`);
                console.log(`First H1: ${templateInfo.h1}`);
                console.log(`First Paragraph: ${templateInfo.firstParagraph}`);
                console.log('-------------------');
            }
        }

        // Write template data to a JSON file
        await fs.writeFile('template-data.json', JSON.stringify(templateData, null, 2));
        console.log('Template data has been written to template-data.json');

    } catch (err) {
        console.error('Error:', err);
    }
}

traverseTemplates();
