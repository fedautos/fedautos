export default async function handler(req, res) {
    // 1. Pega o ID do carro que vem no link compartilhado
    const { id } = req.query;

    if (!id) {
        return res.redirect(302, '/');
    }

    try {
        const projectId = 'fd-autos-site';
        const colecao = 'veiculos';
        
        // URL da API oficial do Firestore para ler o documento direto no servidor
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${colecao}/${id}`;

        const response = await fetch(firestoreUrl);
        const data = await response.json();

        // Se o carro foi excluído ou despublicado, manda pra home
        if (data.error) {
            return res.redirect(302, '/');
        }

        // 2. Extrai os dados exatamente como o Firestore os armazena
        const marca = data.fields.marca?.stringValue || '';
        const versao = data.fields.versao?.stringValue || 'Veículo';
        const preco = data.fields.preco?.stringValue || 'Consulte';
        
        let ano = data.fields.ano?.stringValue || '';
        if (ano.includes('/')) {
            ano = ano.split('/').pop(); // Pega apenas o ano modelo (ex: 2024)
        }
        
        // 3. Tenta pegar a primeira foto. Se não tiver, usa a sua logo
        let fotoUrl = 'https://fedautos.vercel.app/logo.png'; 
        if (data.fields.fotos && data.fields.fotos.arrayValue && data.fields.fotos.arrayValue.values && data.fields.fotos.arrayValue.values.length > 0) {
            fotoUrl = data.fields.fotos.arrayValue.values[0].stringValue;
        }

        // 4. Prepara os textos que vão aparecer no WhatsApp
        const titulo = `F&D Autos | ${marca} ${versao} (${ano}) - R$ ${preco}`;
        const descricao = `Confira este veículo de ótima qualidade em nosso estoque. Clique para ver fotos e mais detalhes!`;
        
        // O link para onde o cliente será jogado ao clicar na foto
        const urlDestino = `https://fedautos.vercel.app/?id=${id}`;

        // 5. Monta a tela "invisível" que o robô do WhatsApp vai ler
        const html = `
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <title>${titulo}</title>
                <meta property="og:title" content="${titulo}">
                <meta property="og:description" content="${descricao}">
                <meta property="og:image" content="${fotoUrl}">
                <meta property="og:type" content="website">
                <meta name="twitter:card" content="summary_large_image">

                <meta http-equiv="refresh" content="0; url=${urlDestino}">
            </head>
            <body>
                <script>
                    window.location.href = "${urlDestino}";
                </script>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);

    } catch (error) {
        console.error('Erro ao gerar o card:', error);
        res.redirect(302, '/');
    }
}
