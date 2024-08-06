import * as html2pdf from 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

document.addEventListener('DOMContentLoaded', async function() {
    const headerMarkdown = document.getElementById('headerMarkdown');
    const contentMarkdown = document.getElementById('contentMarkdown');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');

    const htmlPreview = document.getElementById('htmlPreview');
    const htmlPreviewContent = document.getElementById('htmlPreviewContent');
    const documentTitle = document.getElementById('documentTitle');
    const pickTemplateLink = document.getElementById('pickTemplateLink');
    const modalContainer = document.getElementById('modalContainer');
    const htmlPreviewContainer = document.getElementById('previewContainer');
    const pageSizeDropdown = document.getElementById('pageSizeDropdown');


    let templateModal;
    let templateGrid;
    let tagFilter;
    let currentPageSize = 'a4';
    let customCSS = '';
    let templates = [];
    let allTags = [];
    let selectedTags = new Set();

    // Load the modal HTML
    const modalResponse = await fetch('template-market.html');
    const modalHtml = await modalResponse.text();
    modalContainer.innerHTML = modalHtml;

    templateModal = new bootstrap.Modal(document.getElementById('templateModal'));
    templateGrid = document.getElementById('templateGrid');
    tagFilter = document.getElementById('tagFilter');

    // Load templates data
    const templatesResponse = await fetch('templates.json');
    const templatesData = await templatesResponse.json();
    templates = templatesData.templates;
    allTags = templatesData.allTags;

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

    function showTemplateModal() {
        renderTagFilter();
        renderTemplateGrid();
        templateModal.show();
    }

    function renderTagFilter() {
        tagFilter.innerHTML = allTags.map(tag => 
            `<span class="tag-filter ${selectedTags.has(tag) ?'selected' : ''}" data-tag="${tag}">${tag}</span>`
        ).join(' ');

        tagFilter.querySelectorAll('.tag-filter').forEach(tagElement => {
            tagElement.addEventListener('click', () => {
                const tag = tagElement.dataset.tag;
                if (selectedTags.has(tag)) {
                    selectedTags.delete(tag);
                    tagElement.classList.remove('selected');
                } else {
                    selectedTags.add(tag);
                    tagElement.classList.add('selected');
                }
                renderTemplateGrid();
            });
        });
    }

    function renderTemplateGrid() {
        const filteredTemplates = selectedTags.size > 0
            ? templates.filter(template => [...selectedTags].every(tag => template.tags.includes(tag)))
            : templates;

        templateGrid.innerHTML = filteredTemplates.map((template, index) => `
            <div class="col">
                <div class="card h-100">
                    <img src="${template.thumbnailUrl}" class="card-img-top" alt="${template.name} preview">
                    <div class="card-body">
                        <h5 class="card-title">${template.name}</h5>
                        <p class="card-text">${template.description}</p>
                        <p class="card-text">
                            ${template.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ')}
                        </p>
                        <button class="btn btn-primary select-template" data-index="${index}">Select</button>
                    </div>
                </div>
            </div>
        `).join('\n');

        templateGrid.querySelectorAll('.select-template').forEach(button => {
            button.addEventListener('click', () => selectTemplate(parseInt(button.dataset.index)));
        });
    }

    async function selectTemplate(index) {
        const template = templates[index];
        customCSS = await fetchTemplateCSS(template.name);
        applyCustomCSS();
        templateModal.hide();
        await applyTemplate(template.name);
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

    async function fetchTemplateHTML(templateName) {
        try {
            const response = await fetch(`templates/${templateName}.html`);
            return await response.text();
        } catch (error) {
            console.error('Error loading template HTML:', error);
            return '';
        }
    }

    function applyCustomCSS() {
        let styleElement = htmlPreview.querySelector('style');
        if (!styleElement) {
            styleElement = document.createElement('style');
            htmlPreview.prepend(styleElement);
        }
        styleElement.textContent = `@scope {\n${customCSS}\n}`;
    }

    async function applyTemplate(templateName) {
        const htmlText = await fetchTemplateHTML(templateName);
        const parser = new DOMParser();
        const templateDoc = parser.parseFromString(htmlText, 'text/html');

        const inputFields = templateDoc.querySelectorAll('.input-field');
        const editorInputFields = document.getElementById('editor-input-fields');
        editorInputFields.innerHTML = ''; // Clear existing fields

        inputFields.forEach((field, index) => {
            const name = field.getAttribute('name') || `Section ${index + 1}`;
            const content = field.innerHTML.trim();

            const section = document.createElement('div');
            section.className = 'mb-3';
            section.innerHTML = `
                <h4 class="form-label">${name}</h4>
                <textarea class="form-control" rows="5" data-field-index="${index}">${content}</textarea>
            `;
            editorInputFields.appendChild(section);
        });

        // Update preview with the template content
        htmlPreviewContent.innerHTML = templateDoc.body.innerHTML;

        // Add event listeners to update preview on input
        editorInputFields.querySelectorAll('textarea').forEach(textarea => {
            textarea.addEventListener('input', updatePreview);
        });
    }

    function updatePreview() {
        const inputFields = document.querySelectorAll('#editor-input-fields textarea');
        const previewFields = htmlPreviewContent.querySelectorAll('.input-field');

        inputFields.forEach((textarea, index) => {
            if (previewFields[index]) {
                previewFields[index].innerHTML = marked.parse(textarea.value);
            }
        });
    }

    saveBtn.addEventListener('click', function() {
        const generatedHtml = convertMarkdownToHtml();
        applyCustomCSS();
        htmlPreviewContent.innerHTML = generatedHtml;
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

    // Page size change functionality -- not working, need to fix:
    console.log("1111");
    pageSizeDropdown.querySelectorAll('.dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(event) {
            console.log(event.target.getAttribute('data-size'));
            changePageSize(event.target.getAttribute('data-size'));
        });
    });
    console.log("2222");

    function changePageSize(size) {
        currentPageSize = size;
        htmlPreview.className = ''; // Remove all classes
        htmlPreview.classList.add(`page-size-${size}`);
        
        // Update the preview container's dimensions
        const dimensions = getPageDimensions(size);
        htmlPreview.style.width = `${dimensions.width}px`;
        htmlPreview.style.height = `${dimensions.height}px`;

        
        // Force reflow to ensure the changes take effect
        htmlPreview.offsetHeight;
        console.log('Page size:', size);
    }

    function getPageDimensions(size) {
        const dpi = 96; // Standard screen DPI
        switch (size) {
            case 'a3':
                return { width: 11.7 * dpi, height: 16.5 * dpi };
            case 'a4':
                return { width: 8.27 * dpi, height: 11.7 * dpi };
            case 'letter':
                return { width: 8.5 * dpi, height: 11 * dpi };
            default:
                return { width: 8.27 * dpi, height: 11.7 * dpi }; // Default to A4
        }
    }
    let scale = 1;
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    
    if (zoomInBtn && zoomOutBtn) {
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
    }
    
    function zoomOut() {
        scale += 0.1;
        updateScale();
    }
    
    function zoomIn() {
        if (scale > 0.1) {
            scale -= 0.1;
            updateScale();
        }
    }
    
    function updateScale() {
        htmlPreview.style.transform = `scale(${scale})`;
        console.log('Scale:', scale);
    }
});
