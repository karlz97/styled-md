import * as html2pdf from 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
import html2canvas from 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.esm.js';

document.addEventListener('DOMContentLoaded', function() {
    const headerMarkdown = document.getElementById('headerMarkdown');
    const contentMarkdown = document.getElementById('contentMarkdown');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const htmlPreview = document.getElementById('htmlPreview');
    const documentTitle = document.getElementById('documentTitle');
    const pickTemplateLink = document.getElementById('pickTemplateLink');
    const initTemplatesLink = document.getElementById('initTemplatesLink');
    const editorLink = document.getElementById('editorLink');
    const templateGrid = document.getElementById('templateGrid');

    const templateModal = new bootstrap.Modal(document.getElementById('templateModal'));

    let customCSS = '';
    let templates = [];

    async function initTemplates() {
        try {
            // Simulating template initialization
            templates = [
                { name: 'Template 1', content: '<h1>Template 1</h1><p>This is template 1</p>' },
                { name: 'Template 2', content: '<h1>Template 2</h1><p>This is template 2</p>' },
                // Add more templates as needed
            ];
            console.log('Templates initialized:', templates);
            alert('Templates have been initialized successfully!');
            await renderTemplateGrid();
        } catch (error) {
            console.error('Error initializing templates:', error);
            alert('Failed to initialize templates. Please check the console for more details.');
        }
    }

    initTemplatesLink.addEventListener('click', initTemplates);

    async function generateThumbnail(templateContent) {
        const tempElement = document.createElement('div');
        tempElement.innerHTML = templateContent;
        document.body.appendChild(tempElement);

        try {
            const canvas = await html2canvas(tempElement, {
                width: 700,
                height: 300,
                scale: 1
            });
            document.body.removeChild(tempElement);
            return canvas.toDataURL('image/png');
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            document.body.removeChild(tempElement);
            return null;
        }
    }

    function convertMarkdownToHtml() {
        const headerHtml = marked.parse(headerMarkdown.value);
        const contentHtml = marked.parse(contentMarkdown.value);
        return `
            <div class="header">
                ${headerHtml}
            </div>
            <div class="content">
                ${contentHtml}
            </div>
        `;
    }

    function applyCustomCSS() {
        let styleElement = document.getElementById('customStyle');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'customStyle';
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = customCSS;
    }

    async function showTemplateModal() {
        await scanTemplates();
        await renderTemplateGrid();
        templateModal.show();
    }

    async function renderTemplateGrid() {
        templateGrid.innerHTML = '';
        for (let i = 0; i < templates.length; i++) {
            const template = templates[i];
            const templateItem = document.createElement('div');
            templateItem.className = 'col';
            
            let thumbnailUrl = template.thumbnailUrl;
            if (!thumbnailUrl) {
                thumbnailUrl = await generateThumbnail(template.content);
                template.thumbnailUrl = thumbnailUrl;
            }

            templateItem.innerHTML = `
                <div class="card h-100">
                    <img src="${thumbnailUrl}" class="card-img-top template-preview" alt="${template.name} preview">
                    <div class="card-body">
                        <h5 class="card-title">${template.name}</h5>
                        <button class="btn btn-primary btn-sm select-template">
                            <i class="fas fa-check"></i> Select
                        </button>
                    </div>
                </div>
            `;
            templateItem.querySelector('.select-template').addEventListener('click', () => selectTemplate(i));
            templateGrid.appendChild(templateItem);
        }
    }

    async function selectTemplate(index) {
        const template = templates[index];
        try {
            const response = await fetch(`/templates/${template.name}.css`);
            customCSS = await response.text();
            applyCustomCSS();
            templateModal.hide();
            saveBtn.click(); // Trigger save to apply new CSS
        } catch (error) {
            console.error('Error loading template CSS:', error);
        }
    }

    saveBtn.addEventListener('click', function() {
        const generatedHtml = convertMarkdownToHtml();
        htmlPreview.innerHTML = generatedHtml;
        applyCustomCSS();
    });

    exportBtn.addEventListener('click', function() {
        const generatedHtml = convertMarkdownToHtml();
        const element = document.createElement('div');
        element.innerHTML = generatedHtml;
        
        const filename = documentTitle.value || 'exported_document';
        
        const opt = {
            margin:       10,
            filename:     `${filename}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Apply custom CSS to the element before generating PDF
        const styleElement = document.createElement('style');
        styleElement.textContent = customCSS;
        element.appendChild(styleElement);

        html2pdf().set(opt).from(element).save();
    });

    pickTemplateLink.addEventListener('click', showTemplateModal);

    // // Initialize with default template
    // selectTemplate(0);
});
