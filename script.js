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
    const editorLink = document.getElementById('editorLink');
    const templateGrid = document.getElementById('templateGrid');

    const templateModal = new bootstrap.Modal(document.getElementById('templateModal'));

    let customCSS = '';

    // Sample templates - replace with your actual templates
    const templates = [
        { name: 'Default', css: '' },
        { name: 'Dark', css: 'body { background-color: #333; color: #fff; }' },
        { name: 'Fancy', css: 'body { font-family: "Georgia", serif; } h1 { color: #4a4a4a; }' },
        // Add more templates as needed
    ];

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
        templates.forEach((template, index) => {
            const templateItem = document.createElement('div');
            templateItem.className = 'col';
            templateItem.innerHTML = `
                <div class="card h-100">
                    <div class="template-preview card-img-top"></div>
                    <div class="card-body">
                        <h5 class="card-title">${template.name}</h5>
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

    function selectTemplate(index) {
        customCSS = templates[index].css;
        applyCustomCSS();
        templateModal.hide();
        saveBtn.click(); // Trigger save to apply new CSS
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
    editorLink.addEventListener('click', function(e) {
        e.preventDefault();
        // If there were multiple views, you'd switch to the editor view here
    });

    // Initialize with default template
    selectTemplate(0);
});