// =================================================================
// !!! COLE A URL DA SUA API DO APPS SCRIPT AQUI !!!
const API_URL = "https://script.google.com/macros/s/AKfycbwBodD9gkfmLM3_nSP_MuZxKnDp0vNXDRV-yjeA7mJqIYybyhW2TOBxvkT5_gStrUM7Vw/exec";
// =================================================================

// Variável global para armazenar os dados do usuário
let currentUserData = null;

/**
 * Função principal que é executada quando o DOM está pronto.
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO ---
    currentUserData = JSON.parse(localStorage.getItem("userData"));
    if (!currentUserData) {
        alert("Acesso negado. Por favor, faça o login.");
        window.location.href = "index.html"; 
        return;
    }

    // --- 2. INICIALIZA O DASHBOARD ---
    setupHeader();
    setupMenuListeners();
});

/**
 * Configura o cabeçalho com informações do usuário e botão Sair.
 */
function setupHeader() {
    const userInfoDiv = document.getElementById("user-info");
    userInfoDiv.innerHTML = `
        <span>Olá, <strong>${currentUserData.NomeCompleto}</strong> (${currentUserData.Unidade})</span>
        <button id="logout-button">Sair</button>
    `;

    document.getElementById("logout-button").addEventListener("click", () => {
        localStorage.removeItem("userData");
        alert("Você saiu do sistema.");
        window.location.href = "index.html";
    });
}

/**
 * Adiciona os "escutadores" de clique aos links do menu.
 */
function setupMenuListeners() {
    const menuLinks = document.querySelectorAll(".menu-link");
    menuLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault();
            const area = event.target.getAttribute("data-area");
            loadChecklist(area); // Chama a nova função
        });
    });
}

/**
 * Função para carregar o checklist da API.
 * @param {string} area - O nome da área (ex: "Recebimento")
 */
function loadChecklist(area) {
    const mainContent = document.getElementById("main-content");
    mainContent.innerHTML = `<h2>Carregando Checklist: ${area}...</h2>`;

    // Chama a API usando GET
    fetch(`${API_URL}?action=getChecklist&area=${area}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Sucesso! Chama a função para construir o formulário
                buildChecklistForm(data.area, data.itens);
            } else {
                // Erro vindo da API
                mainContent.innerHTML = `<p style="color:red;">Erro ao carregar checklist: ${data.error}</p>`;
            }
        })
        .catch(error => {
            // Erro de rede/conexão
            console.error("Erro no fetch:", error);
            mainContent.innerHTML = `<p style="color:red;">Erro de conexão com a API.</p>`;
        });
}

/**
 * Constrói o HTML do formulário de checklist dinamicamente.
 * @param {string} area - O nome da área.
 * @param {Array} itens - A lista de itens vinda da API.
 */
function buildChecklistForm(area, itens) {
    const mainContent = document.getElementById("main-content");
    
    if (itens.length === 0) {
        mainContent.innerHTML = `<h2>${area}</h2><p>Nenhum item de checklist cadastrado para esta área.</p>`;
        return;
    }

    // Começa a construir o HTML do formulário
    let formHTML = `
        <h2>Auditoria: ${area}</h2>
        <form id="checklist-form">
            <input type="hidden" name="area" value="${area}">
    `;

    // Cria um item do formulário para cada item do checklist
    itens.forEach(item => {
        formHTML += `
            <div class="checklist-item">
                <label>${item.descricao} (ID: ${item.id})</label>
                
                <div class="resposta-group">
                    <input type="radio" name="${item.id}" value="C" required> C
                    <input type="radio" name="${item.id}" value="NC"> NC
                    <input type="radio" name="${item.id}" value="NA"> NA
                </div>

                <div class="nc-campos" id="nc-campos-${item.id}" style="display:none;">
                    <textarea name="obs-${item.id}" placeholder="Observação obrigatória"></textarea>
                    <input type="file" name="anexo-${item.id}" accept="image/*">
                </div>
            </div>
        `;
    });

    formHTML += `
            <button type="submit" id="submit-checklist">Enviar Auditoria</button>
        </form>
    `;

    mainContent.innerHTML = formHTML;

    // Adiciona os eventos (lógica) ao formulário que acabamos de criar
    addFormLogic();
}

/**
 * Adiciona a lógica de JavaScript ao formulário (mostrar/esconder campos NC).
 */
function addFormLogic() {
    const form = document.getElementById("checklist-form");

    // Adiciona "escutadores" para os botões de rádio (C/NC/NA)
    const radios = form.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
        radio.addEventListener("change", (event) => {
            const itemName = event.target.name; // Ex: "REC-01"
            const itemValue = event.target.value; // Ex: "NC"
            const ncCampos = document.getElementById(`nc-campos-${itemName}`);

            if (itemValue === "NC") {
                ncCampos.style.display = "block"; // Mostra os campos de Obs/Anexo
            } else {
                ncCampos.style.display = "none"; // Esconde
            }
        });
    });

    // Adiciona o "escutador" para o envio do formulário
    form.addEventListener("submit", (event) => {
        event.preventDefault();
        // Na próxima fase, aqui faremos o código para ENVIAR os dados para a API
        alert("Formulário pronto para enviar! (Próxima fase)");
        console.log(new FormData(form)); // Mostra os dados no console
    });
}
