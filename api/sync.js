export default async function handler(req, res) {
    // 1. Bloqueia qualquer tentativa de acesso que não seja o envio de dados (POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // 2. Recebe os dados enviados pelo seu admin.html
    const { acao, idFirebase, nome, preco, descricao, imagemUrl, marca } = req.body;

    // 3. Pega suas credenciais (vamos configurá-las na Vercel depois por segurança)
    const CATALOG_ID = process.env.CATALOG_ID;
    const META_TOKEN = process.env.META_TOKEN;

    try {
        if (acao === 'Criar') {
            // O Facebook exige o preço como string no formato "VALOR BRL"
            // Arredondamos para evitar problemas com casas decimais quebradas
            const precoFormatado = Math.floor(preco || 0).toString() + " BRL";

            // Monta o pacote de dados exigido pela Meta
            const formData = new URLSearchParams();
            formData.append('retailer_id', idFirebase); // A âncora que liga o carro do Firebase ao do Zap
            formData.append('name', nome || 'Veículo F&D Autos');
            formData.append('description', descricao || 'Sem descrição');
            formData.append('image_url', imagemUrl);
            formData.append('url', `https://fdautos.com.br/`); // Coloque o link real do seu site aqui
            formData.append('price', precoFormatado);
            formData.append('brand', marca || 'Diversas');
            formData.append('condition', 'used'); // Seminovos
            formData.append('availability', 'in stock');

            // Envia para o Facebook (Isso Cria ou Atualiza automaticamente se o retailer_id já existir)
            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${META_TOKEN}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()
            });

            const fbData = await fbResponse.json();
            if (fbData.error) throw new Error(fbData.error.message);

            return res.status(200).json({ success: true, message: 'Sucesso no Catálogo!', fbData });

        } else if (acao === 'Excluir') {
            // Para excluir, primeiro achamos qual é o ID interno do Facebook para esse carro
            const getUrl = `https://graph.facebook.com/v19.0/${CATALOG_ID}/products?filter={"retailer_id":{"eq":"${idFirebase}"}}&access_token=${META_TOKEN}`;
            const getRes = await fetch(getUrl);
            const getData = await getRes.json();

            // Se o carro for encontrado lá, nós deletamos
            if (getData.data && getData.data.length > 0) {
                const fbProductId = getData.data[0].id;
                await fetch(`https://graph.facebook.com/v19.0/${fbProductId}?access_token=${META_TOKEN}`, { 
                    method: 'DELETE' 
                });
                return res.status(200).json({ success: true, message: 'Excluído do Catálogo!' });
            } else {
                return res.status(200).json({ success: true, message: 'Já não estava no catálogo.' });
            }
        }

        return res.status(400).json({ error: 'Ação desconhecida' });

    } catch (error) {
        console.error("Erro na Sincronização:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
