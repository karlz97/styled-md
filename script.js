import * as html2pdf from 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

document.addEventListener('DOMContentLoaded', async function() {
    const previewCanvas = document.getElementById('previewCanvas');

    const htmlPreview = previewCanvas.attachShadow({mode: 'open'});     // const htmlPreview = document.getElementById('htmlPreview');
    htmlPreview.innerHTML = `
        <div id="htmlPreviewContent">
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


    let templateModal;
    let templateGrid;
    let tagFilter;
    let currentPageSize = 'a4';
    let customCSS = '';
    let templates = [];
    let allTags = [];
    let selectedTags = new Set();
    let template

    // 
    pickTemplateLink.addEventListener('click', showTemplateModal);
    exportPdfBtn.addEventListener('click', exportDom);
    exportPngBtn.addEventListener('click', exportPng);
    const exportCanvasPdfBtn = document.getElementById('exportCanvasPdfBtn');
    exportCanvasPdfBtn.addEventListener('click', exportCanvsPdf);

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

    // // Load init template
    selectTemplate("Tutorial").then();

    // Page size change functionality
    pageSizeDropdown.querySelectorAll('.dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(event) {
            console.log(event.target.getAttribute('data-size'));
            // updatePageSize(event.target.getAttribute('data-size'));
            currentPageSize = event.target.getAttribute('data-size');
            updatePreview();
        });
    });

    // Function to export PDF
    async function exportDom() {
        const pageBody = htmlPreview.querySelector('.page-body');

        // Clone the page-body element
        const clonedPageBody = pageBody.cloneNode(true);

        // Clear page size and scaling settings
        clearPageSize(clonedPageBody);
        updateScale(clonedPageBody,1)

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

    async function generateCanvas() {
        const pageBody = htmlPreview.querySelector('.page-body');
        const dimensions = getPageDimensions(currentPageSize);

        // Create a temporary container to render the page-body
        const tempContainer = document.createElement('div');
        document.body.appendChild(tempContainer);

        // Clone the page-body and its styles
        const clonedPageBody = pageBody.cloneNode(true);
        clonedPageBody.style.width = `${dimensions.width}px`;
        clonedPageBody.style.height = `${dimensions.height}px`;
        updateScale(clonedPageBody, 1);
        clearBackground(clonedPageBody); // Clear the background of the cloned page body
        tempContainer.appendChild(clonedPageBody);

        // Apply custom CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = customCSS;
        tempContainer.appendChild(styleElement);

        try {
            // Use html2canvas to capture the page-body
            const canvas = await html2canvas(tempContainer, {
                width: dimensions.width,
                height: dimensions.height,
                scale: 4, // Increase scale for higher quality
                useCORS: true,
                logging: false,
            });
            // Return the canvas for reuse in exportPDF
            console.log('Canvas generated successfully');
            return canvas;
        } catch (error) {
            console.error('Error generate Canvas:', error);
            return null;
        } finally {
            // Clean up
            document.body.removeChild(tempContainer);
        }
    }

    async function exportPng() {
        const canvas = await generateCanvas();
        if (!canvas) {
            console.error('Failed to generate canvas for PDF export');
            return;
        }
        // Convert canvas to PNG and download
        const pngData = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngData;
        downloadLink.download = `${documentTitle.value || 'document'}.png`;
        downloadLink.click();
    }

    async function exportCanvsPdf() {
        const canvas = await generateCanvas();
        if (!canvas) {
            console.error('Failed to generate canvas for PDF export');
            return;
        }

        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
        });

        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${documentTitle.value || 'document'}.pdf`);
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
            <div class="col-md-4 col-sm-6 mb-3">
                <div class="card h-100 template-card" data-index="${index}">
                    <img src="${template.thumbnailUrl}" class="card-img-top" alt="${template.name} preview">
                    <div class="card-body p-2">
                        <h6 class="card-title mb-1">${template.name}</h6>
                        <p class="card-text small mb-1">${template.description}</p>
                        <p class="card-text mb-1">
                            ${template.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                        </p>
                        <p class="card-text"><small class="text-muted">By ${template.author}</small></p>
                    </div>
                </div>
            </div>
        `).join('\n');

        templateGrid.querySelectorAll('.template-card').forEach(card => {
            card.addEventListener('click', () => {
                selectTemplate(filteredTemplates[parseInt(card.dataset.index)].name);
                templateModal.hide();
            });
        });
    }

    async function fetchTemplateCSS(templateName) {
        try {
            const response = await fetch(`templates/${templateName}.css`);
            if (response.ok) {
                return await response.text();
            } else {
                throw new Error('CSS file not found');
            }
        } catch (error) {
            console.log('CSS file not found, fetching from HTML...');
            return await fetchCSSFromHTML(templateName);
        }
    }

    async function fetchCSSFromHTML(templateName) {
        try {
            const response = await fetch(`templates/${templateName}.html`);
            const htmlText = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, 'text/html');
            const styleElement = doc.querySelector('style');
            return styleElement ? styleElement.textContent : '';
        } catch (error) {
            console.error('Error fetching CSS from HTML:', error);
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
    }

    async function applyTemplate(templateName) {
        const htmlText = await fetchTemplateHTML(templateName);
        const parser = new DOMParser();
        const templateDoc = parser.parseFromString(htmlText, 'text/html');

        const inputFields = templateDoc.querySelectorAll('.input-field');
        const editorInputFields = document.getElementById('editor-input-fields');
        editorInputFields.innerHTML = ''; // Clear existing fields

        // Get the template instruction
        const instruction = templateDoc.querySelector('#template-instruction');

        // Update the instruction in the editor
        const templateInstruction = document.getElementById('template-instruction');
        templateInstruction.innerHTML = marked.parse(instruction.textContent);

        inputFields.forEach((field, index) => {
            const name = field.getAttribute('name') || 
                (s => s.at(0).toUpperCase()+s.slice(1).toLowerCase())(field.tagName);
            const content = field.innerHTML.trim();

            const section = document.createElement('div');
            section.className = 'mb-3';
            section.innerHTML = `
                <h4 class="form-label">${name}</h4>
                <textarea class="form-control" rows="10" data-field-index="${index}">${content}</textarea>
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

    async function selectTemplateByIndex(index) {
        template = templates[index];
        customCSS = await fetchTemplateCSS(template.name);
        applyCustomCSS();
        await applyTemplate(template.name);
        updatePreview();
    }
    
    async function selectTemplate(name) {
        customCSS = await fetchTemplateCSS(name);
        applyCustomCSS();
        await applyTemplate(name);
        updatePreview();
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

    function clearBackground(element) {
        element.style.backgroundImage = 'none';
        element.style.boxShadow = 'none';
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
        const pageBody = htmlPreview.querySelector('.page-body');
        scale += 0.1;
        updateScale(pageBody, scale);
    }
    
    function zoomIn() {
        const pageBody = htmlPreview.querySelector('.page-body');
        if (scale > 0.1) {
            scale -= 0.1;
            updateScale(pageBody, scale);
        }
    }
    
    function updateScale(p, s) { 
        p.style.transform = `scale(${s})`;
        p.style.transformOrigin = 'top left'; // Ensure it scales from the top left corner
        console.log('Scale:', s);
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
