import * as html2pdf from 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
// import { html } from 'cheerio';

document.addEventListener('DOMContentLoaded', async function() {


    const previewCanvas = document.getElementById('previewCanvas');

    const htmlPreview = previewCanvas.attachShadow({mode: 'open'});     // const htmlPreview = document.getElementById('htmlPreview');
    
    htmlPreview.innerHTML = `
        <div id="htmlPreviewContent">
            <div class="page-body">
                <header class="input-field invitation-header">
                    <h1>John Doe123</h1>
                    <h2>123-456-7890</h2>
                    <h3>Location: New York, NY</h3>
                    <h3><a href="https://linkedin.com/in/johndoe">LinkedIn</a></h3>
                </header>
                <main class="input-field invitation-main">
                    <p>Hi, I'm John Doe. I'm a software developer with 5 years of experience...</p>
                </main>
            </div>
        </div>`;
    const htmlPreviewContent = htmlPreview.getElementById('htmlPreviewContent');    //const htmlPreviewContent = document.getElementById('htmlPreviewContent');
    
    //buttons in the navbar
    const pickTemplateLink = document.getElementById('pickTemplateLink');
    const modalContainer = document.getElementById('modalContainer');

    //buttons in the left panel editor
    const documentTitle = document.getElementById('documentTitle');
    const refreshBtn = document.getElementById('refreshBtn');
    const saveMdBtn = document.getElementById('saveMdBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');


    //buttons in the right panel toolbar
    const pageSizeDropdown = document.getElementById('pageSizeDropdown');

    // Function to export PDF
    async function exportPDF() {
        const pageBody = htmlPreview.querySelector('.page-body');
        const dimensions = getPageDimensions(currentPageSize);
    
        // Clone the page-body element
        const clonedPageBody = pageBody.cloneNode(true);
    
        // Clear page size settings
        clearPageSize(clonedPageBody);
    
        // Create a new window
        const printWindow = window.open('', '_blank');
    
        // Write the HTML content to the new window
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${documentTitle.value || 'Document'}</title>
                <style>
                    ${customCSS}
                    body {
                        margin: 0;
                        padding: 0;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                    }
                    .page-body {
                        margin: auto;
                        box-shadow: none;
                        background-image: none;
                    }
                </style>
            </head>
            <body>
                ${clonedPageBody.outerHTML}
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        }
                    }
                </script>
            </body>
            </html>
        `);
    
        // printWindow.document.close();
    }


    let templateModal;
    let templateGrid;
    let tagFilter;
    let currentPageSize = 'a4';
    let customCSS = '';
    let templates = [];
    let allTags = [];
    let selectedTags = new Set();
    let template

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
        template = templates[index];
        customCSS = await fetchTemplateCSS(template.name);
        applyCustomCSS();
        templateModal.hide();
        await applyTemplate(template.name);
        updatePreview()
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
        styleElement.textContent = `
            .page-body {
                background-image: 
                    linear-gradient(45deg, rgba(0, 0, 0, 0.25) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.25) 75%, rgba(0, 0, 0, 0.25)),
                    linear-gradient(135deg, rgba(0, 0, 0, 0.25) 25%, transparent 25%, transparent 75%, rgba(0, 0, 0, 0.25) 75%, rgba(0, 0, 0, 0.25));
                background-size: 20px 20px;
                background-position: 0 0, 10px 10px;
                box-shadow: 0 0 25px rgba(0,0,0,0.4)
            }
            ${customCSS}`;
        //styleElement.textContent = `@scope {\n${customCSS}\n}`;
    }

    async function applyTemplate(templateName) {
        const htmlText = await fetchTemplateHTML(templateName);
        const parser = new DOMParser();
        const templateDoc = parser.parseFromString(htmlText, 'text/html');

        const inputFields = templateDoc.querySelectorAll('.input-field');
        const editorInputFields = document.getElementById('editor-input-fields');
        editorInputFields.innerHTML = ''; // Clear existing fields

        inputFields.forEach((field, index) => {
            const name = field.getAttribute('name') || 
                // field.tagName;
                (s => s.at(0).toUpperCase()+s.slice(1).toLowerCase())(field.tagName);
            const content = field.innerHTML.trim();

            const section = document.createElement('div');
            section.className = 'mb-3';
            section.innerHTML = `
                <h4 class="form-label">${name}</h4>
                <textarea class="form-control" rows="5" data-field-index="${index}">${content}</textarea>
            `;
            editorInputFields.appendChild(section);
        });

        // Store the original template HTML
        originalTemplateHTML = templateDoc.body.innerHTML;

        // Update preview with the template content
        htmlPreviewContent.innerHTML = originalTemplateHTML;

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
        toggleFlex();
        toggleBorder();
        toggleStretch();
        updatePageSize(currentPageSize);
    }

    refreshBtn.addEventListener('click', function() {    //TODO
        applyCustomCSS();
        console.log('Custom CSS applied');
        updatePreview();
        console.log('Preview updated..');
    });

    pickTemplateLink.addEventListener('click', showTemplateModal);

    exportPdfBtn.addEventListener('click', exportPDF);

    // Page size change functionality -- not working, need to fix:
    pageSizeDropdown.querySelectorAll('.dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(event) {
            console.log(event.target.getAttribute('data-size'));
            // updatePageSize(event.target.getAttribute('data-size'));
            currentPageSize = event.target.getAttribute('data-size');
            updatePreview();
        });
    });

    function updatePageSize(size) {
        const pageBody = htmlPreview.querySelector('.page-body');
        currentPageSize = size;
        pageBody.className = ''; // Remove all classes
        pageBody.classList.add(`page-body`);
        pageBody.classList.add(`page-size-${size}`);
        pageBody.style.display = `flex`;

        // Update the preview container's dimensions
        const dimensions = getPageDimensions(size);
        pageBody.style.width = `${dimensions.width}px`;
        pageBody.style.height = `${dimensions.height}px`;

        // Force reflow to ensure the changes take effect
        pageBody.offsetHeight;
        console.log('Page size:', size);
    }

    function clearPageSize(pageBody) {
        pageBody.style.width = '';
        pageBody.style.height = '';
        pageBody.className = 'page-body';
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
    const flexCheckbox = document.getElementById('flexCheckbox');
    const borderCheckbox = document.getElementById('borderCheckbox');
    const stretchCheckbox = document.getElementById('stretchCheckbox');
    const resetBtn = document.getElementById('resetBtn');
    
    zoomInBtn.addEventListener('click', zoomIn);
    zoomOutBtn.addEventListener('click', zoomOut);
    flexCheckbox.addEventListener('change', toggleFlex);
    borderCheckbox.addEventListener('change', toggleBorder);
    stretchCheckbox.addEventListener('change', toggleStretch);
    resetBtn.addEventListener('click', resetTemplate);

    let originalBorder = {};
    let originalAlignSelf = {};
    
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
        const pageBody = htmlPreview.querySelector('.page-body');
        pageBody.style.transform = `scale(${scale})`;
        pageBody.style.transformOrigin = 'top left'; // Ensure it scales from the top left corner
        console.log('Scale:', scale);
    }


    function toggleFlex() {
        const pageBody = htmlPreview.querySelector('.page-body');
        const directChildren = pageBody.children;
        
        for (let child of directChildren) {
            if (flexCheckbox.checked) {
                child.style.flex = '1';
            } else {
                child.style.flex = '';
            }
        }
    }

    let originalTemplateHTML = '';

    function toggleBorder() {
        const pageBody = htmlPreview.querySelector('.page-body');
        const directChildren = pageBody.children;

        if (borderCheckbox.checked) {
            // Apply original borders
            for (let child of directChildren) {
                if (originalBorder[child.tagName]) {
                    child.style.border = originalBorder[child.tagName];
                }
            }
        } else {
            // Remove borders and store original values
            for (let child of directChildren) {
                const computedStyle = window.getComputedStyle(child);
                originalBorder[child.tagName] = computedStyle.border;
                child.style.border = '0';
            }
        }
    }

    function toggleStretch() {
        const pageBody = htmlPreview.querySelector('.page-body');
        const directChildren = pageBody.children;

        for (let child of directChildren) {
            if (stretchCheckbox.checked) {
                originalAlignSelf[child.tagName] = child.style.alignSelf;
                child.style.alignSelf = 'stretch';
            } else {
                child.style.alignSelf = originalAlignSelf[child.tagName] || '';
            }
        }
    }

    function resetTemplate() {
        if (originalTemplateHTML) {
            htmlPreviewContent.innerHTML = originalTemplateHTML;
            applyCustomCSS();
            updatePreview();
        
            // Reset checkboxes and original values
            borderCheckbox.checked = true;
            stretchCheckbox.checked = false;
            originalBorder = {};
            originalAlignSelf = {};
        }
    }
});
