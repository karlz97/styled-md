import * as html2pdf from 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

document.addEventListener('DOMContentLoaded', function() {
    const headerMarkdown = document.getElementById('headerMarkdown');
    const contentMarkdown = document.getElementById('contentMarkdown');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const htmlPreview = document.getElementById('htmlPreview');
    const documentTitle = document.getElementById('documentTitle');
    const pickTemplateLink = document.getElementById('pickTemplateLink');
    const initTemplatesLink = document.getElementById('initTemplatesLink');
    const templateGrid = document.getElementById('templateGrid');

    const templateModal = new bootstrap.Modal(document.getElementById('templateModal'));

    let customCSS = '';
    let templates = [];

    async function initTemplates() {
        try {
            const templatesDir = await window.showDirectoryPicker();
            for await (const entry of templatesDir.values()) {
                if (entry.name.endsWith('.html')) {
                    const file = await entry.getFile();
                    const content = await file.text();
                    const name = entry.name.replace('.html', '');
                    const thumbnailUrl = await generateThumbnail(content);
                    templates.push({ name, content, thumbnailUrl });
                }
            }
            console.log('Templates initialized:', templates);
            alert('Templates have been initialized successfully!');
            renderTemplateGrid();
        } catch (error) {
            console.error('Error initializing templates:', error);
            alert('Failed to initialize templates. Please check the console for more details.');
        }
    }

    async function generateThumbnail(htmlContent) {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        iframe.style.width = '700px';
        iframe.style.height = '300px';
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        document.body.appendChild(iframe);

        return new Promise((resolve, reject) => {
            iframe.onload = async () => {
                try {
                    const canvas = await html2canvas(iframe.contentDocument.body, {
                        width: 700,
                        height: 300,
                        scale: 1
                    });
                    document.body.removeChild(iframe);
                    URL.revokeObjectURL(url);
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    reject(error);
                }
            };
            iframe.src = url;
        });
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

    function showTemplateModal() {
        renderTemplateGrid();
        templateModal.show();
    }

    function renderTemplateGrid() {
        templateGrid.innerHTML = '';
        for (let i = 0; i < templates.length; i++) {
            const template = templates[i];
            const templateItem = document.createElement('div');
            templateItem.className = 'col';
            templateItem.innerHTML = `
                <div class="card h-100">
                    <img src="${template.thumbnailUrl}" class="card-img-top" alt="${template.name} preview">
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
        customCSS = await fetchTemplateCSS(template.name);
        applyCustomCSS();
        templateModal.hide();
        saveBtn.click(); // Trigger save to apply new CSS
    }

    async function fetchTemplateCSS(templateName) {
        try {
            const response = await fetch(`templates/${templateName}.css`);
            return await response.text();
        } catch (error) {
            console.error('Error loading template CSS:', error);
            return '';
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
    initTemplatesLink.addEventListener('click', initTemplates);
});
