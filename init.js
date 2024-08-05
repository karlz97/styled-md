const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const templatesDir = path.join(__dirname, 'templates');

async function generateThumbnail(htmlFilePath, outputPath) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({width: 800, height: 800, deviceScaleFactor: 0});
    await page.goto(`file://${htmlFilePath}`);
    await page.screenshot({ path: outputPath, fullPage: false });
    await browser.close();

    // Resize the image to ensure it's exactly 700x300
    await sharp(outputPath)
        // .resize(300, 700, { fit: 'cover' })
        .toFile(outputPath.replace('.png', '_resized.png'));

    // Replace the original screenshot with the resized one
    await fs.rename(outputPath.replace('.png', '_resized.png'), outputPath);
}

async function traverseTemplates() {
    try {
        const files = await fs.readdir(templatesDir);

        for (const file of files) {
            if (path.extname(file) === '.html') {
                const htmlFilePath = path.join(templatesDir, file);
                const thumbnailPath = path.join(templatesDir, `${path.basename(file, '.html')}.png`);

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
            }
        }
    } catch (error) {
        console.error('Error traversing templates:', error);
    }
}

traverseTemplates();
