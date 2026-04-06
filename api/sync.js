// Após confirmar que salvou/excluiu no Firebase com sucesso, chame o gatilho:
fetch('/api/sync', {
    method: 'POST'
})
.then(response => response.json())
.then(data => {
    if(data.success) {
        console.log("Catálogo da Meta atualizado com sucesso!");
        // Opcional: Você pode colocar um alert() ou toast notification aqui
    } else {
        console.error("Falha ao avisar a Meta:", data.error);
    }
})
.catch(error => console.error("Erro na requisição de sync:", error));
