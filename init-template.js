const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const templatesDir = path.join(__dirname, 'templates');

function traverseTemplates() {
    fs.readdir(templatesDir, (err, files) => {
        if (err) {
            console.error('Error reading templates directory:', err);
            return;
        }

        files.forEach(file => {
            if (path.extname(file) === '.html') {
                const filePath = path.join(templatesDir, file);
                fs.readFile(filePath, 'utf8', (err, content) => {
                    if (err) {
                        console.error(`Error reading file ${file}:`, err);
                        return;
                    }

                    const $ = cheerio.load(content);
                    const title = $('title').text();
                    const h1 = $('h1').first().text();
                    const firstParagraph = $('p').first().text();

                    console.log(`File: ${file}`);
                    console.log(`Title: ${title}`);
                    console.log(`First H1: ${h1}`);
                    console.log(`First Paragraph: ${firstParagraph}`);
                    console.log('-------------------');
                });
            }
        });
    });
}

traverseTemplates();
