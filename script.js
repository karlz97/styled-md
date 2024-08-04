document.getElementById("convert-button").addEventListener("click", () => {
  const markdownInput = document.getElementById("markdown-input").value;

  // Use marked to convert Markdown to HTML
  const htmlContent = marked.parse(markdownInput);

  const previewDiv = document.getElementById("preview");
  previewDiv.innerHTML = htmlContent;
  previewDiv.style.display = "block";

  const opt = {
    margin: 1,
    filename: "output.pdf",
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
  };

  html2pdf().from(previewDiv).set(opt).save();
});
