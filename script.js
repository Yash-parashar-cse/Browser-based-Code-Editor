// ============== UTILITIES ===============
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const out = $("#Output");
const preview = $("#preview");
const STORAGE_KEY = "academy-codelab-web";

const escapeHtml = s =>
    String(s).replace(/[&<>"]/g, c => ({
        '&': "&amp;",
        '<' : "&lt;",
        '>' : "&gt;",
        ' " ': "&quot;"
    }[c]
));

function log(msg, type='info'){
    const color= type === "error" ? 'var(--err)' : type === "warn" ? "var(--warn)"  : "var(--brand)";
    const time = new Date().toLocaleTimeString();
    const line= document.createElement("div");
    line.innerHTML = `<span style="color:${color}">[${time}]</span> ${escapeHtml(msg)}`;

    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}
function clearOut(){
    out.innerHTML = "";
}

$("#clearOut")?.addEventListener("click", clearOut);

function makeEditor(id, mode){
    const ed = ace.edit(id, {
        theme:"ace/theme/dracula",
        mode, tabSize :2, useSoftTabs: true, showPrintMargin: false, wrap : true
    });
    ed.session.setUseWrapMode(true);
    ed.commands.addCommand({
        name: "run",
        bindKey: {
            win: 'Ctrl-Enter',
            mac: 'Command-Enter'
        },
        exec(){runWeb(false);}
    });
    ed.commands.addCommand({
        name: "save",
        bindKey: {
            win: "Ctrl-S",
            mac: "Command-S"
        },
        exec(){saveProject();}
    });
    return ed
}

const ed_html = makeEditor("ed_html", "ace/theme/html");
const ed_css = makeEditor("ed_css", "ace/theme/css");
const ed_js = makeEditor("ed_js", "ace/theme/javascript");

const TAB_ORDER= ["html", "css", "js"];
const wraps = Object.fromEntries($$("#webEditors .editor-wrap").map(w => [w.dataset.pane, w]));

const editors = {
    html: ed_html,
    css :ed_css,
    js: ed_js
};

function activePane(){
    const t = $("#webTabs .tab.active");
    return t ? t.dataset.pane : "html";
}

function showPane(name) {
    // 1. Correctly loop through the wraps and hide/show them
    TAB_ORDER.forEach(k => {
        const wrap = $(`[data-pane="${k}"].editor-wrap`);
        if (wrap) {
            if (k === name) {
                wrap.removeAttribute('hidden');
                wrap.style.display = "block"; // Force visibility
            } else {
                wrap.setAttribute('hidden', 'true');
                wrap.style.display = "none"; // Force hide
            }
        }
    });

    // 2. Update the Tab buttons UI
    $$("#webTabs .tab").forEach(t => {
        const isTarget = t.dataset.pane === name;
        t.classList.toggle("active", isTarget);
        t.setAttribute("aria-selected", isTarget);
        t.tabIndex = isTarget ? 0 : -1;
    });

    // 3. Tell Ace Editor to refresh its size
    requestAnimationFrame(() => {
        const ed = editors[name];
        if (ed) {
            ed.resize();
            ed.focus();
        }
    });
}

$("#webTabs")?.addEventListener("click", (e)=>{
    const btn = e.target.closest(".tab");
    if(!btn){
        return;
    }
    showPane(btn.dataset.pane);
})

$("#webTabs")?.addEventListener("keydown", (e)=>{
    const idx = TAB_ORDER.indexOf(activePane());
    if(e.key=== "ArrowLeft" || e.key === "ArrowRight"){
        const delta = e.key === "ArrowLeft"? -1: 1;
        showPane(TAB_ORDER[(idx + delta + TAB_ORDER.length) % TAB_ORDER.length]);
    }
})

showPane("html");

function bulidwebSrcdoc(withTests=false){
    const html = ed_html.getValue();
    const css = ed_css.getValue();
    const js = ed_js.getValue();
    const tests = ($("#testArea")?.value || '').trim();

    return `
    <!DOCTYPE html>
    <html lang ="en" dir="ltr">
    <head>
        <meta charset="UTF-8">
        <meta name = "viewport" content ="width=device-width,initial-scale=1.0">
        <style>
            ${css}\n
        </style>
    </head>
    <body>
        ${html}
        <script>
            try{
            ${js}
            ${withTests && tests ? `\n/* tests */\n${tests}` : ''}
            }
            catch(e){
                console.error(e);
            }
        </script>
    </body>
    </html>
    `;
    
}

function runWeb(withTests=false){
    preview.srcdoc = bulidwebSrcdoc(withTests);
    log(withTests ? "Run with tests" : "Web preview updated.");
}

$("#runWeb")?.addEventListener("click", () => runWeb(false));
$("#runTests")?.addEventListener("click", () => runWeb(true));

$("#openPreview")?.addEventListener("click", ()=> {
    const src = bulidwebSrcdoc(false);
    const w = window.open("about:blank");
    w.document.open();
    w.document.write(src);
    w.document.close(); //Close the window to prevent losing resources.
})

function projectJSON(){
    return {
        version : 1,
        kind : 'web-only',
        assignment : $("#assignment")?.value || "",
        test : $("#testArea")?.value || "",
        html: ed_html.getValue(),
        css: ed_css.getValue(),
        js: ed_js.getValue()
    };
}

function loadProject(obj){
    try{
        if($('#assignment')) $("#assignment").value = obj.assignment || "";
        if($('#testArea')) $("#testArea").value = obj.test || "";

        ed_html.setValue(obj.html || "", -1);
        ed_css.setValue(obj.css || "", -1);
        ed_js.setValue(obj.js || "", -1);

        log("Web Project loaded.");

    }
    catch(e){
        log("unable to load project: " + e, "error");
    }
}

function setDefaultContent(){
    ed_html.setValue(`<!-- Write your html code here... -->`,-1);
    ed_css.setValue(`/*  Write your css code here...*/`,-1);
    ed_js.setValue(` //  Write your javaScript code here...`, -1);
}

function saveProject(){
    try{
        const data = JSON.stringify(projectJSON(),null, 2);
        localStorage.setItem(STORAGE_KEY, data);
        const blob = new Blob([data],{type:"application/json"});
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "academy-web.json";
        a.click(); //this is a programmatic way of clicking on elements

        log("Saved locally and downloaded JSON file");
    }catch(e){
        log("unable to save: " + e,"error");
    }
}

$("#savebtn")?.addEventListener("click", saveProject);
$("#loadbtn")?.addEventListener("click", () =>$("#openFile").click());
$("#openFile")?.addEventListener("change", async (e) =>{``
    const f = e.target.files ?.[0];
    if(!f){
        return;
    }
    try{
        const obj = JSON.parse(await f.text());
        loadProject(obj);
    }
    catch(err){
        log("Invalid project file", "error");
    }
});
try{
    const cache = localStorage.getItem(STORAGE_KEY);
    if(cache){
        loadProject(JSON.parse(cache));
    }else{
        setDefaultContent();
    }
} catch{
    setDefaultContent();
}
log("Ready - Web only Editor (HTML / CSS / JS)");