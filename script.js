import * as html2pdf from 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

document.addEventListener('DOMContentLoaded', async function() {
    const headerMarkdown = document.getElementById('headerMarkdown');
    const contentMarkdown = document.getElementById('contentMarkdown');
    const saveBtn = document.getElementById('saveBtn');
    const exportBtn = document.getElementById('exportBtn');
    
    const htmlPreviewContainer = document.getElementById('htmlPreview');
    const htmlPreview = htmlPreviewContainer.attachShadow({mode: 'open'});

    const documentTitle = document.getElementById('documentTitle');
    const pickTemplateLink = document.getElementById('pickTemplateLink');
    const modalContainer = document.getElementById('modalContainer');

    let templateModal;
    let templateGrid;
    let tagFilter;
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
        // Clear existing content
        while (htmlPreview.firstChild) {
            htmlPreview.removeChild(htmlPreview.firstChild);
        }
        
        // Create a new style element
        const styleElement = document.createElement('style');
        styleElement.textContent = customCSS;
        
        // Append the style element to the shadow DOM
        htmlPreview.appendChild(styleElement);
        
        // Create a div to hold the content
        const contentDiv = document.createElement('div');
        contentDiv.id = 'preview-content';
        htmlPreview.appendChild(contentDiv);
    }

    function applyTemplate(templateName) {
        fetchTemplateHTML(templateName).then(html => {
            // Parse the fetched HTML text
            const parser = new DOMParser();
            const templateDoc = parser.parseFromString(htmlText, 'text/html');

            // Select all elements with class "input-field"
            const inputFieldsNodeList = templateDoc.querySelectorAll('.input-field');

            // Convert NodeList to Array
            const inputFieldsArray = Array.from(inputFieldsNodeList);
        });
    }

    saveBtn.addEventListener('click', function() {
        const generatedHtml = convertMarkdownToHtml();
        applyCustomCSS();
        const contentDiv = htmlPreview.getElementById('preview-content');
        contentDiv.innerHTML = generatedHtml;
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
