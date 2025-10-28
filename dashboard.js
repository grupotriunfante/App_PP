// =================================================================
// !!! IMPORTANTE: COLE A URL DA SUA API DO APPS SCRIPT AQUI !!!
const API_URL = "https://script.google.com/macros/s/AKfycbwBodD9gkfmLM3_nSP_MuZxKnDp0vNXDRV-yjeA7mJqIYybyhW2TOBxvkT5_gStrUM7Vw/exec";
// =================================================================


/**
 * Função principal que é executada quando o DOM está pronto.
 */
document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. VERIFICAÇÃO DE AUTENTICAÇÃO ---
    // Esta é a parte mais importante.
    // Buscamos os dados do usuário que salvamos no localStorage na tela de login.
    const userData = JSON.parse(localStorage.getItem("userData"));

    // Se NÃO houver dados, o usuário não está logado.
    if (!userData) {
        // Redireciona de volta para a tela de login.
        alert("Acesso negado. Por favor, faça o login.");
        window.location.href = "index.html"; 
        return; // Para a execução do script
    }

    // --- 2. SE O USUÁRIO ESTÁ LOGADO ---
    
    // Exibe as informações do usuário no cabeçalho
    const userInfoDiv = document.getElementById("user-info");
    userInfoDiv.innerHTML = `
        <span>Olá, <strong>${userData.NomeCompleto}</strong> (${userData.Unidade})</span>
        <button id="logout-button">Sair</button>
    `;

    // Adiciona o evento de clique ao botão "Sair"
    document.getElementById("logout-button").addEventListener("click", () => {
        // Limpa os dados do usuário do navegador
        localStorage.removeItem("userData");
        // Redireciona para o login
        alert("Você saiu do sistema.");
        window.location.href = "index.html";
    });


    // --- 3. ADICIONA EVENTOS AOS LINKS DO MENU ---
    const menuLinks = document.querySelectorAll(".menu-link");
    const mainContent = document.getElementById("main-content");

    menuLinks.forEach(link => {
        link.addEventListener("click", (event) => {
            event.preventDefault(); // Impede que o link recarregue a página
            
            const area = event.target.getAttribute("data-area");
            
            // Chama a função para carregar o checklist
            loadChecklist(area);
        });
    });

    /**
     * Função para carregar o checklist (POR ENQUANTO, APENAS UM TESTE)
     * Na próxima fase, esta função fará um fetch() para a API.
     * @param {string} area - O nome da área (ex: "Recebimento")
     */
    function loadChecklist(area) {
        mainContent.innerHTML = `
            <h2>Carregando Checklist: ${area}</h2>
            <p>Aguarde...</p>
            <p>(Na próxima fase, o formulário real aparecerá aqui.)</p>
        `;
        
        // --- PRÉVIA DA PRÓXIMA FASE ---
        // Na próxima fase, faremos o código abaixo:
        // 
        // fetch(API_URL + "?action=getChecklist&area=" + area)
        //   .then(response => response.json())
        //   .then(data => {
        //       if(data.success) {
        //           buildChecklistForm(data.itens);
        //       }
        //   });
    }

});
