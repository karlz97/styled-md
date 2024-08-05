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

async function generateTemplateModal() {
    const templates = [];
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

            templates.push({
                name: metadata.name,
                description: metadata.description,
                tags: metadata.tag.split(',').map(tag => tag.trim()),
                thumbnailUrl: `templates/${path.basename(file, '.html')}.png`
            });
        }
    }

    // Generate template-modal.html content
    const modalContent = `
<!-- Template Selection Modal -->
<div class="modal-dialog modal-lg">
    <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title" id="templateModalLabel">Template Market</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <div id="templateGrid" class="row row-cols-1 row-cols-md-3 g-4">
                ${templates.map(template => `
                    <div class="col">
                        <div class="card h-100">
                            <img src="${template.thumbnailUrl}" class="card-img-top" alt="${template.name} preview">
                            <div class="card-body">
                                <h5 class="card-title">${template.name}</h5>
                                <p class="card-text">${template.description}</p>
                                <p class="card-text"><small class="text-muted">Tags: ${template.tags.join(', ')}</small></p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
</div>
    `;

    // Write the generated content to template-modal.html
    await fs.writeFile('template-modal.html', modalContent);
    console.log('template-modal.html generated successfully');
}

async function init() {
    try {
        await generateTemplateModal();
    } catch (error) {
        console.error('Error initializing:', error);
    }
}

init();
