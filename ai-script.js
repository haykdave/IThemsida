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
    const escaped = escapeHtml(markdown);
    const blocks = escaped.split(/\n\s*\n/);

    return blocks
      .map((block) => {
        const trimmed = block.trim();

        if (!trimmed) {
          return "";
        }

        if (trimmed.startsWith("### ")) {
          return `<h3>${inlineFormat(trimmed.slice(4))}</h3>`;
        }

        if (trimmed.startsWith("## ")) {
          return `<h2>${inlineFormat(trimmed.slice(3))}</h2>`;
        }

        if (trimmed.startsWith("# ")) {
          return `<h1>${inlineFormat(trimmed.slice(2))}</h1>`;
        }

        const lines = trimmed.split("\n");
        const isList = lines.every((line) => /^[-*]\s+/.test(line));

        if (isList) {
          const items = lines
            .map((line) => `<li>${inlineFormat(line.replace(/^[-*]\s+/, ""))}</li>`)
            .join("");
          return `<ul>${items}</ul>`;
        }

        return `<p>${inlineFormat(trimmed).replace(/\n/g, "<br />")}</p>`;
      })
      .join("");
  }

  function inlineFormat(text) {
    return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
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
