export default async function handler(req, res) {
    // Garante que só aceita envios de dados
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { acao, idFirebase, nome, preco, descricao, imagemUrl, marca } = req.body;

    // Puxa das configurações que você fez na Vercel (Environment Variables)
    const CATALOG_ID = process.env.CATALOG_ID || "643608957084425";
    const META_TOKEN = process.env.META_TOKEN || "EAANmnZANCSuoBRJsJFxaixciy2ylU11bPGUPJEjjxypsuAGkQTi4SYntzlyDsrQUn65bmKx4e84RSsDIwNSSPjvW3283tlNGYeqNBEWWST5MH9uadyO4U0Lh7lefANMeI4PcHvzaNTruLIutyvGEQaMbSSbcK23ZAbHnN9EwKRDJ7GWvZAIcfus0T9eLgZDZD";

    try {
        if (acao === 'Criar') {
            const precoFormatado = Math.floor(preco || 0).toString() + " BRL";

            const params = new URLSearchParams();
            params.append('retailer_id', idFirebase);
            params.append('name', nome || 'Veículo F&D Autos');
            params.append('description', descricao || 'Sem descrição');
            params.append('image_url', imagemUrl);
            params.append('url', `https://fdautos.com.br/`); 
            params.append('price', precoFormatado);
            params.append('brand', marca || 'Volkswagen');
            params.append('condition', 'used');
            params.append('availability', 'in stock');

            // Aqui usamos o fetch que já existe no Node 24
            const fbResponse = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/products`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${META_TOKEN}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const fbData = await fbResponse.json();
            
            if (fbData.error) {
                return res.status(400).json({ success: false, error: fbData.error.message });
            }

            return res.status(200).json({ success: true, message: 'Sincronizado!', data: fbData });

        } else if (acao === 'Excluir') {
            // Busca o item para deletar
            const searchRes = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/products?filter={"retailer_id":{"eq":"${idFirebase}"}}&access_token=${META_TOKEN}`);
            const searchData = await searchRes.json();

            if (searchData.data && searchData.data.length > 0) {
                const fbId = searchData.data[0].id;
                await fetch(`https://graph.facebook.com/v19.0/${fbId}?access_token=${META_TOKEN}`, { method: 'DELETE' });
            }
            return res.status(200).json({ success: true, message: 'Removido!' });
        }

    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
