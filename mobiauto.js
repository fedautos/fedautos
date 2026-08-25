// mobiauto.js - Módulo de Integração Mobiauto

export function gerarXMLMobiauto(veiculo) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<cargas>
  <veiculo>
    <codigo>${veiculo.id || ''}</codigo>
    <titulo><![CDATA[${veiculo.titulo || veiculo.modelo || ''}]]></titulo>
    <marca><![CDATA[${veiculo.marca || ''}]]></marca>
    <modelo><![CDATA[${veiculo.modelo || ''}]]></modelo>
    <versao><![CDATA[${veiculo.versao || ''}]]></versao>
    <ano_fabricacao>${veiculo.ano || ''}</ano_fabricacao>
    <ano_modelo>${veiculo.ano || ''}</ano_modelo>
    <preco>${veiculo.preco || 0}</preco>
    <quilometragem>${veiculo.km || 0}</quilometragem>
    <cor><![CDATA[${veiculo.cor || ''}]]></cor>
    <combustivel><![CDATA[${veiculo.combustivel || 'Flex'}]]></combustivel>
    <cambio><![CDATA[${veiculo.cambio || 'Flex'}]]></cambio>
    <descricao><![CDATA[${veiculo.descricao || ''}]]></descricao>
    <placa>${veiculo.placa || ''}</placa>
  </veiculo>
</cargas>`.trim();
}

export async function integrarMobiauto(dadosVeiculo) {
  try {
    if (!dadosVeiculo) {
      throw new Error("Nenhum dado do veículo encontrado na página.");
    }

    const xmlData = gerarXMLMobiauto(dadosVeiculo);

    // Tenta sincronizar com o backend da Vercel na pasta /api/feed.js
    try {
      await fetch('/api/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: xmlData
      });
    } catch (e) {
      console.warn("Envio de API ignorado, copiando dados diretamente.");
    }

    // Copia o XML para a área de transferência do usuário
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(xmlData);
    }

    alert("Mobiauto: Dados processados e XML gerado com sucesso!");
    return { sucesso: true, xml: xmlData };

  } catch (erro) {
    console.error("Erro na integração Mobiauto:", erro);
    alert("Falha na integração Mobiauto: " + erro.message);
    return { sucesso: false, erro: erro.message };
  }
}
