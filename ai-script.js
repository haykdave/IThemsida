(function () {
  const courseSelect = document.getElementById("course-select");
  const typeSelect = document.getElementById("type-select");
  const generateBtn = document.getElementById("generate-btn");
  const spinner = document.getElementById("loading-spinner");
  const btnText = generateBtn?.querySelector(".btn-text");
  const outputContainer = document.getElementById("ai-output-container");
  const courseTitle = document.getElementById("output-course-title");
  const examContent = document.getElementById("exam-content");
  const facitContent = document.getElementById("facit-content");
  const toggleFacitBtn = document.getElementById("toggle-facit-btn");

  if (
    !courseSelect ||
    !typeSelect ||
    !generateBtn ||
    !spinner ||
    !btnText ||
    !outputContainer ||
    !courseTitle ||
    !examContent ||
    !facitContent ||
    !toggleFacitBtn
  ) {
    return;
  }

  let facitVisible = false;

  generateBtn.addEventListener("click", async () => {
    const courseId = courseSelect.value;
    const exerciseType = typeSelect.value;

    if (!courseId) {
      renderMessage("Välj en kurs först så att vi vet vilka tentor som ska användas.");
      return;
    }

    setLoading(true);
    facitVisible = false;
    facitContent.classList.add("hidden");
    toggleFacitBtn.classList.add("hidden");

    try {
      const response = await fetch("/api/mock-exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          exerciseType,
        }),
      });

      const rawBody = await response.text();
      const payload = rawBody ? safeJsonParse(rawBody) : null;

      if (!response.ok) {
        throw new Error(
          payload?.error ||
            `Kunde inte generera övningstentan. Status ${response.status}.`
        );
      }

      if (!payload) {
        throw new Error(
          "Servern svarade inte med giltig JSON. Kontrollera terminalen där `npm start` körs."
        );
      }

      courseTitle.textContent = payload.title || "Genererad Tenta";
      examContent.innerHTML = renderSimpleMarkdown(payload.examMarkdown || "");
      facitContent.innerHTML = renderSimpleMarkdown(payload.answerKeyMarkdown || "");
      outputContainer.classList.remove("hidden");
      renderMath(examContent);
      renderMath(facitContent);

      if (payload.answerKeyMarkdown) {
        toggleFacitBtn.classList.remove("hidden");
        toggleFacitBtn.textContent = "Visa Facit";
      }
    } catch (error) {
      renderMessage(error.message || "Något gick fel.");
    } finally {
      setLoading(false);
    }
  });

  toggleFacitBtn.addEventListener("click", () => {
    facitVisible = !facitVisible;
    facitContent.classList.toggle("hidden", !facitVisible);
    toggleFacitBtn.textContent = facitVisible ? "Dölj Facit" : "Visa Facit";

    if (facitVisible) {
      renderMath(facitContent);
    }
  });

  function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    spinner.classList.toggle("hidden", !isLoading);
    btnText.textContent = isLoading ? "Genererar..." : "Generera Tenta";
  }

  function renderMessage(message) {
    courseTitle.textContent = "Tenta AI";
    examContent.innerHTML = `<p>${escapeHtml(message)}</p>`;
    facitContent.innerHTML = "";
    outputContainer.classList.remove("hidden");
    facitContent.classList.add("hidden");
    toggleFacitBtn.classList.add("hidden");
  }

  function renderSimpleMarkdown(markdown) {
    const lines = markdown.replace(/\r/g, "").split("\n");
    const html = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index].trim();

      if (!line) {
        index += 1;
        continue;
      }

      if (/^---+$/.test(line)) {
        html.push("<hr />");
        index += 1;
        continue;
      }

      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^[-*]\s+/.test(line)) {
        const items = [];

        while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
          items.push(`<li>${inlineFormat(lines[index].trim().replace(/^[-*]\s+/, ""))}</li>`);
          index += 1;
        }

        html.push(`<ul>${items.join("")}</ul>`);
        continue;
      }

      if (/^\d+\.\s+/.test(line)) {
        const items = [];

        while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
          items.push(`<li>${inlineFormat(lines[index].trim().replace(/^\d+\.\s+/, ""))}</li>`);
          index += 1;
        }

        html.push(`<ol>${items.join("")}</ol>`);
        continue;
      }

      const paragraphLines = [];

      while (index < lines.length) {
        const current = lines[index].trim();

        if (
          !current ||
          /^---+$/.test(current) ||
          /^(#{1,3})\s+/.test(current) ||
          /^[-*]\s+/.test(current) ||
          /^\d+\.\s+/.test(current)
        ) {
          break;
        }

        paragraphLines.push(lines[index].trim());
        index += 1;
      }

      if (paragraphLines.length) {
        html.push(renderParagraph(paragraphLines));
        continue;
      }

      index += 1;
    }

    return html.join("");
  }

  function inlineFormat(text) {
    return escapeHtml(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function renderParagraph(lines) {
    const content = lines.map((line) => inlineFormat(line)).join("<br />");
    const firstLine = lines[0] || "";

    if (/^(\d+[\.:]|uppgift\s+\d+[:]?)/i.test(firstLine)) {
      return `<p class="question-line">${content}</p>`;
    }

    if (/^[a-z]\)/i.test(firstLine)) {
      return `<p class="subquestion-line">${content}</p>`;
    }

    if (/^\*\*poang:\*\*/i.test(firstLine) || /^\*\*kort svar:\*\*/i.test(firstLine)) {
      return `<p class="meta-line">${content}</p>`;
    }

    return `<p>${content}</p>`;
  }

  function renderMath(container) {
    if (!container || !window.MathJax?.typesetPromise) {
      return;
    }

    window.MathJax.typesetPromise([container]).catch((error) => {
      console.error("MathJax kunde inte rendera matematiken.", error);
    });
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function safeJsonParse(value) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return null;
    }
  }
})();
