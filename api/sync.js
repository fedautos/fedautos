export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');

    const { acao, idFirebase, nome, preco, descricao, imagemUrl, marca } = req.body;
    const CATALOG_ID = process.env.CATALOG_ID || "643608957084425";
    const META_TOKEN = process.env.META_TOKEN || "EAANmnZANCSuoBRJsJFxaixciy2ylU11bPGUPJEjjxypsuAGkQTi4SYntzlyDsrQUn65bmKx4e84RSsDIwNSSPjvW3283tlNGYeqNBEWWST5MH9uadyO4U0Lh7lefANMeI4PcHvzaNTruLIutyvGEQaMbSSbcK23ZAbHnN9EwKRDJ7GWvZAIcfus0T9eLgZDZD";

    try {
        if (acao === 'Criar') {
            // Limpa o preço para ter apenas números
            const precoLimpo = String(preco).replace(/\D/g, '');

            const params = new URLSearchParams();
            params.append('retailer_id', String(idFirebase));
            params.append('name', String(nome || 'Veículo F&D Autos').substring(0, 100));
            params.append('description', String(descricao || 'Consulte para mais detalhes').substring(0, 5000));
            params.append('image_url', imagemUrl);
            params.append('url', 'https://fdautos.com.br'); 
            
            // AQUI ESTÁ A CORREÇÃO: Campos separados para preço e moeda
            params.append('price', precoLimpo); 
            params.append('currency', 'BRL'); 
            
            params.append('brand', (marca || 'Volkswagen').trim());
            params.append('condition', 'used');
            params.append('availability', 'in stock');

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
                console.error("DETALHE DO ERRO DA META:", JSON.stringify(fbData.error));
                return res.status(400).json({ success: false, meta_error: fbData.error });
            }

            return res.status(200).json({ success: true, data: fbData });
        } else if (acao === 'Excluir') {
            const searchRes = await fetch(`https://graph.facebook.com/v19.0/${CATALOG_ID}/products?filter={"retailer_id":{"eq":"${idFirebase}"}}&access_token=${META_TOKEN}`);
            const searchData = await searchRes.json();
            if (searchData.data && searchData.data.length > 0) {
                const fbId = searchData.data[0].id;
                await fetch(`https://graph.facebook.com/v19.0/${fbId}?access_token=${META_TOKEN}`, { method: 'DELETE' });
            }
            return res.status(200).json({ success: true, message: 'Processado' });
        }
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
