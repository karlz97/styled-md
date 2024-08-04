import * as html2pdf from 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

document.addEventListener('DOMContentLoaded', async function() {
    const headerMarkdown = document.getElementById('headerMarkdown');
    const contentMarkdown = document.getElementById('contentMarkdown');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    const htmlPreview = document.getElementById('htmlPreview');
    const documentTitle = document.getElementById('documentTitle');
    const pickTemplateLink = document.getElementById('pickTemplateLink');
    const initTemplatesLink = document.getElementById('initTemplatesLink');
    const modalContainer = document.getElementById('modalContainer');

    let templateModal;
    let templateGrid;
    let customCSS = '';
    let templates = [];

    // Load the modal HTML
    const modalResponse = await fetch('template-modal.html');
    const modalHtml = await modalResponse.text();
    modalContainer.innerHTML = modalHtml;

    templateModal = new bootstrap.Modal(document.getElementById('templateModal'));
    templateGrid = document.getElementById('templateGrid');

    // Fetch templates data from the server
    async function fetchTemplates() {
        try {
            const response = await fetch('/api/templates');
            templates = await response.json();
        } catch (error) {
            console.error('Error fetching templates:', error);
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
        await fetchTemplates();
        renderTemplateGrid();
        templateModal.show();
    }

    function renderTemplateGrid() {
        templateGrid.innerHTML = '';
        templates.forEach((template, index) => {
            const templateItem = document.createElement('div');
            templateItem.className = 'col';
            templateItem.innerHTML = `
                <div class="card h-100">
                    <img src="${template.thumbnailUrl}" class="card-img-top" alt="${template.name} preview">
                    <div class="card-body">
                        <h5 class="card-title">${template.name}</h5>
                        <p class="card-text">${template.description}</p>
                        <button class="btn btn-primary btn-sm select-template">
                            <i class="fas fa-check"></i> Select
                        </button>
                    </div>
                </div>
            `;
            templateItem.querySelector('.select-template').addEventListener('click', () => selectTemplate(index));
            templateGrid.appendChild(templateItem);
        });
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
});
