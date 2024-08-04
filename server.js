const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const app = express();
const port = 3000;

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

app.get('/scan-templates', async (req, res) => {
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

                templateInfo.thumbnailUrl = `/templates/${path.basename(file, '.html')}.png`;
                templateData.push(templateInfo);
            }
        }

        res.json(templateData);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to scan templates' });
    }
});

app.use(express.static(__dirname));

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
