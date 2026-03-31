export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Método não permitido');

    const { acao, idFirebase, nome, preco, descricao, imagemUrl, marca } = req.body;
    const CATALOG_ID = process.env.CATALOG_ID || "643608957084425";
    const META_TOKEN = process.env.META_TOKEN || "EAANmnZANCSuoBRJsJFxaixciy2ylU11bPGUPJEjjxypsuAGkQTi4SYntzlyDsrQUn65bmKx4e84RSsDIwNSSPjvW3283tlNGYeqNBEWWST5MH9uadyO4U0Lh7lefANMeI4PcHvzaNTruLIutyvGEQaMbSSbcK23ZAbHnN9EwKRDJ7GWvZAIcfus0T9eLgZDZD";

    try {
        if (acao === 'Criar') {
            // 1. Limpeza radical do preço
            const precoApenasNumeros = String(preco).replace(/[^0-9]/g, '');
            const precoFinal = (parseInt(precoApenasNumeros) || 0).toString() + " BRL";

            // 2. Garantir que a URL da imagem é válida (Facebook não aceita URLs curtas ou locais)
            if (!imagemUrl || !imagemUrl.startsWith('http')) {
                return res.status(400).json({ success: false, error: "A URL da imagem é inválida ou não é pública." });
            }

            const params = new URLSearchParams();
            params.append('retailer_id', String(idFirebase));
            params.append('name', String(nome || 'Veículo F&D Autos').substring(0, 100));
            params.append('description', String(descricao || 'Consulte para mais detalhes').substring(0, 5000));
            params.append('image_url', imagemUrl);
            params.append('url', 'https://fdautos.com.br'); 
            params.append('price', precoFinal);
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
                // ISSO AQUI VAI APARECER NO LOG DA VERCEL EM VERMELHO
                console.error("DETALHE DO ERRO DA META:", JSON.stringify(fbData.error));
                return res.status(400).json({ success: false, meta_error: fbData.error });
            }

            return res.status(200).json({ success: true, data: fbData });
        }
        
        // ... (resto do código de excluir permanece igual)
        return res.status(200).json({ success: true, message: "Ação processada" });

    } catch (err) {
        console.error("ERRO NO SERVIDOR:", err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}
