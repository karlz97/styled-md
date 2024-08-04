const fs = require('fs').promises;
const path = require('path');
const cheerio = require('cheerio');

const templatesDir = path.join(__dirname, 'templates');

async function traverseTemplates() {
    try {
        const files = await fs.readdir(templatesDir);
        const templateData = [];

        for (const file of files) {
            if (path.extname(file) === '.html') {
                const filePath = path.join(templatesDir, file);
                const content = await fs.readFile(filePath, 'utf8');
                const $ = cheerio.load(content);

                const templateInfo = {
                    name: path.basename(file, '.html'),
                    title: $('title').text(),
                    h1: $('h1').first().text(),
                    firstParagraph: $('p').first().text(),
                };

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
