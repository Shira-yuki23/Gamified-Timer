(() => {
    const backgrounds = [
        {id: "moon", name: "Moon", file: "moon.gif"},
        {id: "rain", name: "Rain", file: "rain.gif"},
        {id: "secluded-beauty", name: "Secluded Beauty", file: "Secluded Beauty.gif"},
        {id: "sunny", name: "Sunny", file: "sunny.gif"},
        {id: "windy", name: "Windy", file: "windy.gif"}
    ];
    const key = "melofocusTheme";
    let theme = "basic", selected = backgrounds[0], previewsReady = false;
    try {
        const saved = localStorage.getItem(key);
        if (["basic", "dark", "custom"].includes(saved)) theme = saved;
        selected = backgrounds.find(item => item.id === localStorage.getItem("melofocusBackground")) || selected;
    } catch (_) {}
    const url = item => "./Assets/Background/" + encodeURIComponent(item.file);
    const save = () => {
        try {
            localStorage.setItem(key, theme);
            localStorage.setItem("melofocusBackground", selected.id);
        } catch (_) {}
    };
    function previews() {
        const list = document.getElementById("backgroundChoices");
        if (!list || previewsReady) return;
        backgrounds.forEach(item => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "background-choice";
            button.dataset.backgroundChoice = item.id;
            button.setAttribute("aria-label", item.name + " background");
            const img = document.createElement("img");
            img.src = url(item);
            img.alt = "";
            img.loading = "lazy";
            img.decoding = "async";
            const name = document.createElement("span");
            name.textContent = item.name;
            button.append(img, name);
            button.addEventListener("click", () => { selected = item; apply("custom"); save(); });
            list.appendChild(button);
        });
        previewsReady = true;
    }
    function apply(value) {
        theme = ["basic", "dark", "custom"].includes(value) ? value : "basic";
        document.documentElement.dataset.theme = theme;
        // Only fetch the animated wallpaper when Custom is active.
        if (theme === "custom") document.documentElement.style.setProperty("--custom-background", 'url("' + url(selected) + '")');
        else document.documentElement.style.removeProperty("--custom-background");
        document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "basic" ? "#4ade80" : "#12151e");
        document.querySelectorAll("[data-theme-choice]").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
        });
        const picker = document.getElementById("customBackgroundPicker");
        if (picker) picker.hidden = theme !== "custom";
        if (theme === "custom") previews();
        document.querySelectorAll("[data-background-choice]").forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.backgroundChoice === selected.id));
        });
        const label = document.getElementById("selectedBackground");
        if (label) label.textContent = selected.name;
    }
    apply(theme);
    document.addEventListener("DOMContentLoaded", () => {
        apply(theme);
        document.querySelectorAll("[data-theme-choice]").forEach(button => {
            button.addEventListener("click", () => { apply(button.dataset.themeChoice); save(); });
        });
    });
})();