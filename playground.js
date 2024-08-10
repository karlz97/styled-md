
// URL of the subpage
const subpageUrl = 'http://localhost:8080/templates/Time%20New%20Roam%20Resume.html';

// Function to fetch and parse the subpage HTML
async function fetchSubpageContent(url) {
    try {
        // Fetch the HTML content of the subpage
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        const htmlText = await response.text();
        console.log(htmlText);
        return htmlText;
    } catch (error) {
        console.error('Error fetching or parsing the subpage:', error);
    }
    
}

// Call the function to fetch and parse the subpage content
fetchSubpageContent(subpageUrl);
