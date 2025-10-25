import { ContractTemplate, ContractType } from './types';

export const empresaData: Record<string, string> = {
    NOME_EMPRESA: "ASFALTO CATIVANTE - UNIPESSOAL LDA",
    TIPO_SOCIEDADE: "sociedade unipessoal por quotas",
    NIPC_EMPRESA: "517112604",
    MORADA_EMPRESA: "Praceta Alexandre Herculano, 5 3° ESQ, 2745-706 Queluz",
    LICENCA_TVDE: "225124/2025",
    VALIDADE_LICENCA_TVDE: "31/07/2035",
    REPRESENTANTE_NOME: "Paulo Rogério Costa Ferreira",
    REPRESENTANTE_CARGO: "único sócio-gerente",
    REPRESENTANTE_NIF: "218953941",
    REPRESENTANTE_MORADA: "Praceta Alexandre Herculano, 5 3° ESQ, 2745-706 Queluz",
    NOME_OPERADORA: "ASFALTO CATIVANTE - UNIPESSOAL LDA",
    NIPC_OPERADORA: "517112604", 
    MORADA_OPERADORA: "Praceta Alexandre Herculano, 5 3° ESQ, 2745-706 Queluz",
    NOME_OPERADOR: "ASFALTO CATIVANTE - UNIPESSOAL LDA",
    NIPC_OPERADOR: "517112604",
    MORADA_OPERADOR: "Praceta Alexandre Herculano, 5 3° ESQ, 2745-706 Queluz",
    N_LICENCA: "225124/2025"
};

export const contractTemplates: Record<ContractType, ContractTemplate> = {
    prestacao: {
        title: "Contrato de Prestação de Serviços TVDE",
        fields: [
            { name: "NOME_MOTORISTA", label: "Nome do Motorista", type: "text", required: true, category: "motorista" },
            { name: "MORADA_MOTORISTA", label: "Morada do Motorista", type: "text", required: true, category: "motorista" },
            { name: "CC", label: "Cartão de Cidadão / Autorização de Residência / Passaporte", type: "text", required: true, category: "motorista" },
            { name: "VALIDADE_CC", label: "Validade do Documento", type: "date", required: true, category: "motorista" },
            { name: "CERTIFICADO_TVDE", label: "Certificado TVDE", type: "text", required: true, category: "motorista" },
            { name: "EMAIL_MOTORISTA", label: "E-mail do Motorista", type: "email", required: true, category: "motorista" },
            { name: "MARCA", label: "Marca do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MODELO", label: "Modelo do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MATRICULA", label: "Matrícula", type: "text", required: true, category: "veiculo" },
            { name: "DUA", label: "Número DUA", type: "text", required: true, category: "veiculo" },
            { name: "APOLICE", label: "Apólice de Seguro", type: "text", required: true, category: "veiculo" },
            { name: "VALIDADE_SEGURO", label: "Validade do Seguro", type: "date", required: true, category: "veiculo" },
            { name: "KM_INICIAL", label: "Quilometragem Inicial", type: "number", required: true, category: "veiculo" },
            { name: "ESTADO_EXTERIOR", label: "Estado Exterior", type: "text", required: true, category: "veiculo", default: "Bom, sem danos visíveis." },
            { name: "ESTADO_INTERIOR", label: "Estado Interior", type: "text", required: true, category: "veiculo", default: "Bom, limpo e higienizado." },
            { name: "ESTADO_PNEUS", label: "Estado dos Pneus", type: "text", required: true, category: "veiculo", default: "Bom estado." },
            { name: "NIVEL_COMBUSTIVEL", label: "Nível Combustível", type: "text", required: true, category: "veiculo", default: "1/4" },
            { name: "MODALIDADE_PERCENTAGEM", label: "Ativar modalidade percentual (4% serviço + 6% IVA)", type: "checkbox", required: false, category: "financeiro" },
            { name: "VALOR_TAXA", label: "Taxa Semanal (€)", type: "number", required: true, category: "financeiro" },
            { name: "DURACAO_CONTRATO", label: "Duração do Contrato", type: "text", required: true, category: "financeiro", default: "1 ano" },
            { name: "DATA_ASSINATURA", label: "Data de Assinatura", type: "date", required: true, default: new Date().toISOString().split('T')[0], category: "financeiro" }
        ],
        template: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS TVDE

ENTRE:

{{NOME_EMPRESA}}, {{TIPO_SOCIEDADE}}, com sede em {{MORADA_EMPRESA}}, com o número de pessoa coletiva {{NIPC_EMPRESA}}, na qualidade de Operadora TVDE registada e licenciada junto do Instituto da Mobilidade e dos Transportes, I.P., sob o n.º de licença {{LICENCA_TVDE}}, válida até {{VALIDADE_LICENCA_TVDE}}, aqui representada pelo seu {{REPRESENTANTE_CARGO}} {{REPRESENTANTE_NOME}}, residente na mesma morada da sede, contribuinte fiscal nº {{REPRESENTANTE_NIF}}, doravante designada abreviadamente por "Primeira Contraente" ou "Operadora TVDE";

E

{{NOME_MOTORISTA}}, residente em {{MORADA_MOTORISTA}}, portador do Cartão de Cidadão n.º {{CC}}, válido até {{VALIDADE_CC}}, e do Certificado de Motorista TVDE n.º {{CERTIFICADO_TVDE}}, doravante designado abreviadamente por "Segundo Contraente" ou "Motorista".

CONSIDERANDO QUE:
A. A Primeira Contraente dedica-se à actividade de Operadora TVDE, devidamente licenciada junto do IMT, para transporte individual e remunerado de passageiros em viaturas descaracterizadas a partir de plataforma electrónica;
B. O Segundo Contraente é motorista devidamente certificado para a actividade de transporte em viatura descaracterizada a partir de plataforma electrónica;
C. As Partes têm interesse em regular, por escrito e de boa-fé, a relação de prestação de serviços entre a Frota/Operadora TVDE e o Motorista.

Celebram o presente Contrato de Prestação de Serviços TVDE, que se regerá pelas seguintes cláusulas:

CLÁUSULA PRIMEIRA (Objecto)
O presente contrato tem por objecto a prestação, pelo Segundo Contraente, de serviços de motorista TVDE no interesse e no âmbito da actividade da Primeira Contraente.

CLÁUSULA SEGUNDA (Autonomia)
A prestação de serviços é realizada em regime de independência funcional, sem subordinação hierárquica. O Motorista organiza livremente o seu tempo de trabalho, respeitando os limites legais. O presente contrato não gera vínculo laboral nem relação de trabalho subordinado.

CLÁUSULA TERCEIRA (Exclusividade)
Durante a vigência deste contrato, o Motorista obriga-se a utilizar exclusivamente as viaturas fornecidas pela Primeira Contraente para o exercício da actividade TVDE. Não poderá, sem autorização expressa, utilizar viaturas próprias ou de terceiros em concorrência directa.

CLÁUSULA QUARTA (Serviços e meios)
O Motorista obriga-se a prestar os serviços de transporte TVDE através das plataformas digitais activas (Uber, Bolt, FreeNow ou outras). A Primeira Contraente compromete-se a fornecer viatura devidamente licenciada, seguro válido e equipamentos necessários, bem como viatura de substituição em caso de avaria não imputável ao Motorista. Mantém em vigor os seguros obrigatórios (Responsabilidade Civil + Acidentes Pessoais TVDE).

CLÁUSULA QUARTA-A (Identificação da Viatura)
A viatura disponibilizada para a prestação de serviços é identificada com os seguintes dados:
Marca: {{MARCA}}
Modelo/Versão: {{MODELO}}
Matrícula: {{MATRICULA}}
N.º DUA: {{DUA}}
N.º Apólice de Seguro: {{APOLICE}} / Validade: {{VALIDADE_SEGURO}}
Quilometragem Inicial: {{KM_INICIAL}}

Estado da viatura na entrega:
- Exterior: {{ESTADO_EXTERIOR}}
- Interior: {{ESTADO_INTERIOR}}
- Pneus: {{ESTADO_PNEUS}}
- Combustível/Carregamento: {{NIVEL_COMBUSTIVEL}}

{{CLAUSULA_QUINTA_REMUNERACAO}}

CLÁUSULA SEXTA (Forma de Pagamento)
Os pagamentos são efectuados semanalmente, por transferência bancária, após dedução das quantias previstas. O Motorista obriga-se a emitir recibo electrónico no prazo máximo de 5 dias úteis.

CLÁUSULA SÉTIMA (Despesas)
São da responsabilidade exclusiva do Motorista as despesas inerentes à utilização da viatura: combustível, portagens, estacionamento, limpeza e outros encargos necessários.

CLÁUSULA OITAVA (Viatura)
O Motorista compromete-se a zelar pelo bom estado da viatura fornecida. Em caso de utilização negligente ou danos não cobertos pelo seguro, assume integral responsabilidade. A viatura poderá estar equipada com sistemas de geolocalização. No termo do contrato, a viatura deve ser entregue em bom estado, com todos os documentos e acessórios.

CLÁUSULA NONA (Obrigações do Motorista)
O Motorista obriga-se a cumprir a Lei n.º 45/2018, respeitar o limite máximo de 10 horas de condução em 24 horas, ser portador do livrete individual de controlo, manter seguro de acidentes pessoais, utilizar a viatura apenas para os serviços contratados, observar o Código da Estrada e manter todos os documentos legais válidos.

CLÁUSULA DÉCIMA (Responsabilidade)
O Motorista responde civil, criminal e contraordenacionalmente pelos actos praticados no exercício da actividade. Em caso de acidente imputável, suporta os encargos não cobertos pelo seguro, incluindo franquias. A Primeira Contraente não responde por actos ou omissões dos clientes transportados.

CLÁUSULA DÉCIMA PRIMEIRA (Confidencialidade)
As partes obrigam-se a guardar sigilo relativamente a todas as informações comerciais, operacionais ou pessoais obtidas no âmbito deste contrato.

CLÁUSULA DÉCIMA SEGUNDA (Protecção de Dados)
O tratamento de dados pessoais será realizado em conformidade com o RGPD, destinando-se exclusivamente à execução do contrato.

CLÁUSULA DÉCIMA TERCEIRA (Duração e Renovação)
O contrato tem a duração inicial de {{DURACAO_CONTRATO}} a contar da data da assinatura, renovando-se automaticamente por iguais períodos, salvo denúncia.

CLÁUSULA DÉCIMA QUARTA (Cessação e Denúncia)
Qualquer incumprimento contratual grave permite a resolução imediata do contrato. Qualquer das partes pode denunciar o contrato mediante aviso escrito com 15 dias de antecedência.

Lisboa, {{DATA_ASSINATURA}}`,
        signatures: ["REPRESENTANTE_NOME", "NOME_MOTORISTA"]
    },
    aluguer: {
        title: "Contrato de Aluguer de Viatura para Fins TVDE",
        fields: [
            { name: "NOME_MOTORISTA", label: "Nome do Motorista", type: "text", required: true, category: "motorista" },
            { name: "MORADA_MOTORISTA", label: "Morada do Motorista", type: "text", required: true, category: "motorista" },
            { name: "CC", label: "Cartão de Cidadão / Autorização de Residência / Passaporte", type: "text", required: true, category: "motorista" },
            { name: "VALIDADE_CC", label: "Validade do Documento", type: "date", required: true, category: "motorista" },
            { name: "CERTIFICADO_TVDE", label: "Certificado TVDE", type: "text", required: true, category: "motorista" },
            { name: "EMAIL_MOTORISTA", label: "E-mail do Motorista", type: "email", required: true, category: "motorista" },
            { name: "MODALIDADE_50_50", label: "Ativar modalidade 50/50 (desativa renda fixa)", type: "checkbox", required: false, category: "financeiro" },
            { name: "VALOR_RENDA", label: "Renda Semanal (€)", type: "number", required: true, category: "financeiro" },
            { name: "VALOR_CAUCAO", label: "Valor da Caução (€)", type: "number", required: true, category: "financeiro" },
            { name: "DURACAO_CONTRATO", label: "Duração do Contrato", type: "text", required: true, category: "financeiro", default: "1 ano" },
            { name: "MULTA_CESSACAO", label: "Multa por Cessação (€)", type: "number", required: true, category: "financeiro", default: 250 },
            { name: "MARCA", label: "Marca do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MODELO", label: "Modelo do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MATRICULA", label: "Matrícula", type: "text", required: true, category: "veiculo" },
            { name: "DUA", label: "Número DUA", type: "text", required: true, category: "veiculo" },
            { name: "APOLICE", label: "Apólice de Seguro", type: "text", required: true, category: "veiculo" },
            { name: "VALIDADE_SEGURO", label: "Validade do Seguro", type: "date", required: true, category: "veiculo" },
            { name: "KM_INICIAL", label: "Quilometragem Inicial", type: "number", required: true, category: "veiculo" },
            { name: "ESTADO_EXTERIOR", label: "Estado Exterior", type: "text", required: true, category: "veiculo", default: "Bom, sem danos visíveis." },
            { name: "ESTADO_INTERIOR", label: "Estado Interior", type: "text", required: true, category: "veiculo", default: "Bom, limpo e higienizado." },
            { name: "ESTADO_PNEUS", label: "Estado dos Pneus", type: "text", required: true, category: "veiculo", default: "Bom estado." },
            { name: "NIVEL_COMBUSTIVEL", label: "Nível Combustível", type: "text", required: true, category: "veiculo", default: "1/4" },
            { name: "DATA_ASSINATURA", label: "Data de Assinatura", type: "date", required: true, default: new Date().toISOString().split('T')[0], category: "financeiro" }
        ],
        template: `CONTRATO DE ALUGUER DE VIATURA PARA FINS TVDE

ENTRE:

{{NOME_EMPRESA}}, pessoa colectiva n.º {{NIPC_EMPRESA}}, com sede em {{MORADA_EMPRESA}}, aqui representada pelo seu {{REPRESENTANTE_CARGO}} {{REPRESENTANTE_NOME}}, residente na mesma morada da sede, contribuinte fiscal nº {{REPRESENTANTE_NIF}}, doravante designada abreviadamente por "Primeira Contraente" ou "Frota/Operadora TVDE";

E

{{NOME_MOTORISTA}}, residente em {{MORADA_MOTORISTA}}, portador do Cartão de Cidadão n.º {{CC}}, válido até {{VALIDADE_CC}}, e do Certificado de Motorista TVDE n.º {{CERTIFICADO_TVDE}}, doravante designado abreviadamente por "Segundo Contraente" ou "Motorista".

CONSIDERANDO QUE:
A. A Primeira Contraente dedica-se à actividade de Operadora TVDE, devidamente licenciada junto do IMT sob o n.º de licença {{LICENCA_TVDE}}, válida até {{VALIDADE_LICENCA_TVDE}}, para transporte individual e remunerado de passageiros em viaturas descaracterizadas a partir de plataforma electrónica;
B. O Segundo Contraente é motorista devidamente certificado para a actividade de transporte em viatura descaracterizada a partir de plataforma electrónica;
C. As Partes têm interesse em regular, por escrito e de boa-fé, a relação de aluguer de viatura entre a Frota/Operadora TVDE e o Motorista.

Celebram o presente Contrato de Aluguer de Viatura para Fins TVDE, que se regerá pelas seguintes cláusulas:

CLÁUSULA PRIMEIRA (Objecto)
O presente contrato tem por objecto o aluguer de uma viatura da frota da Primeira Contraente ao Segundo Contraente, para fins exclusivos de actividade TVDE, mediante o pagamento de renda semanal.

CLÁUSULA SEGUNDA (Autonomia)
O Segundo Contraente exerce a actividade TVDE de forma independente, sem subordinação hierárquica à Primeira Contraente. Este contrato não gera vínculo laboral nem relação de trabalho subordinado.

CLÁUSULA TERCEIRA (Exclusividade)
A viatura disponibilizada pela Primeira Contraente será utilizada pelo Motorista exclusivamente para a actividade TVDE, não podendo ser cedida a terceiros ou utilizada para outros fins sem autorização escrita.

CLÁUSULA QUARTA (Serviços e meios)
A Primeira Contraente compromete-se a fornecer ao Motorista uma viatura devidamente licenciada e registada como TVDE, segura e em bom estado de funcionamento, bem como a manter em vigor os seguros obrigatórios (Responsabilidade Civil e Acidentes Pessoais).

CLÁUSULA QUARTA-A (Identificação da Viatura Alugada)
A viatura disponibilizada ao Motorista será identificada em Anexo I, com indicação de marca, modelo, matrícula, n.º do Documento Único Automóvel, n.º da apólice de seguro, validade e quilometragem inicial. Será igualmente lavrado Auto de Entrega e, no termo do contrato, Auto de Devolução.

CLÁUSULA QUINTA (Renda/Aluguer da Viatura)
O Segundo Contraente obriga-se a pagar à Primeira Contraente uma renda semanal mínima de {{VALOR_RENDA}} €, liquidada antecipadamente, até à segunda-feira de cada semana. O valor inclui utilização da viatura devidamente licenciada, seguro automóvel obrigatório, seguro de acidentes pessoais e manutenção periódica. O atraso superior a 3 dias úteis no pagamento confere à Primeira Contraente o direito de suspender o contrato e recolher de imediato a viatura.

CLÁUSULA SEXTA (Forma de Pagamento)
O pagamento da renda semanal será efectuado por transferência bancária para a conta da Primeira Contraente, ou em numerário contra recibo. O Motorista obriga-se a emitir recibo electrónico quando aplicável.

CLÁUSULA SÉTIMA (Despesas)
São da responsabilidade exclusiva do Motorista todas as despesas inerentes à utilização da viatura, nomeadamente combustível ou carregamento eléctrico, portagens, estacionamento, lavagens e quaisquer multas ou contra-ordenações.

CLÁUSULA OITAVA (Viatura)
O Motorista compromete-se a zelar pelo bom estado da viatura. Em caso de utilização negligente ou danos não cobertos pelo seguro, assume integral responsabilidade. No termo do contrato, a viatura deve ser entregue em bom estado, com todos os documentos e acessórios.

CLÁUSULA NONA (Obrigações do Motorista)
O Motorista obriga-se a cumprir a Lei n.º 45/2018, respeitar o limite máximo de 10 horas de condução em 24 horas, ser portador do livrete individual de controlo, manter os documentos legais válidos, e utilizar a viatura exclusivamente para a actividade contratada.

CLÁUSULA DÉCIMA (Responsabilidade)
O Motorista responde civil, criminal e contra-ordenacionalmente pelos actos praticados no exercício da actividade. Em caso de acidente imputável, suporta os encargos não cobertos pelo seguro, incluindo franquias. A Primeira Contraente não responde por actos ou omissões dos clientes transportados.

CLÁUSULA DÉCIMA PRIMEIRA (Caução)
A Primeira Contraente poderá reter, a título de caução, o valor de {{VALOR_CAUCAO}} €, a devolver no termo do contrato caso não existam danos ou encargos por regularizar.

CLÁUSULA DÉCIMA SEGUNDA (Confidencialidade)
As partes obrigam-se a guardar sigilo relativamente a todas as informações comerciais, operacionais ou pessoais obtidas no âmbito deste contrato.

CLÁUSULA DÉCIMA TERCEIRA (Protecção de Dados)
O tratamento de dados pessoais será realizado em conformidade com o RGPD, destinando-se exclusivamente à execução do contrato.

CLÁUSULA DÉCIMA QUARTA (Duração e Renovação)
O contrato tem a duração inicial de {{DURACAO_CONTRATO}}, renovando-se automaticamente por iguais períodos, salvo denúncia.

CLÁUSULA DÉCIMA QUINTA (Cessação e Denúncia)
Qualquer incumprimento contratual grave permite a resolução imediata do contrato. Qualquer das partes pode denunciar o contrato mediante aviso escrito com 15 dias de antecedência. O não cumprimento do aviso prévio implica o pagamento de {{MULTA_CESSACAO}} € ou desconto proporcional na caução.

Lisboa, {{DATA_ASSINATURA}}

---

ANEXO I – AUTO DE ENTREGA DA VIATURA

Marca: {{MARCA}}
Modelo/Versão: {{MODELO}}
Matrícula: {{MATRICULA}}
N.º DUA: {{DUA}}
N.º Apólice de Seguro: {{APOLICE}} / Validade: {{VALIDADE_SEGURO}}
Quilometragem Inicial: {{KM_INICIAL}}

Estado da viatura na entrega:
- Exterior: {{ESTADO_EXTERIOR}}
- Interior: {{ESTADO_INTERIOR}}
- Pneus: {{ESTADO_PNEUS}}
- Combustível/Carregamento: {{NIVEL_COMBUSTIVEL}}`,
        signatures: ["REPRESENTANTE_NOME", "NOME_MOTORISTA"]
    },
    uber: {
        title: "Declaração de Autorização para Inscrição Uber",
        fields: [
            { name: "NOME_PROPRIETARIO", label: "Nome do Proprietário do Veículo", type: "text", required: true, category: "proprietario" },
            { name: "MORADA_PROPRIETARIO", label: "Morada do Proprietário", type: "text", required: true, category: "proprietario" },
            { name: "NIF_PROPRIETARIO", label: "NIF do Proprietário", type: "text", required: true, category: "proprietario" },
            { name: "MARCA", label: "Marca do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MODELO", label: "Modelo do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MATRICULA", label: "Matrícula", type: "text", required: true, category: "veiculo" },
            { name: "DATA_MATRICULA", label: "Data de Matrícula", type: "date", required: true, category: "veiculo" },
            { name: "NOME_MOTORISTA", label: "Nome do Motorista", type: "text", required: true, category: "motorista" },
            { name: "MORADA_MOTORISTA", label: "Morada do Motorista", type: "text", required: true, category: "motorista" },
            { name: "CC", label: "Cartão de Cidadão / Autorização de Residência / Passaporte", type: "text", required: true, category: "motorista" },
            { name: "VALIDADE_CC", label: "Validade do Documento", type: "date", required: true, category: "motorista" },
            { name: "EMAIL_MOTORISTA", label: "E-mail do Motorista", type: "email", required: true, category: "motorista" },
            { name: "CERTIFICADO_TVDE", label: "Certificado TVDE", type: "text", required: true, category: "motorista" },
            { name: "DATA_ASSINATURA", label: "Data de Assinatura", type: "date", required: true, default: new Date().toISOString().split('T')[0], category: "geral" }
        ],
        template: `DECLARAÇÃO DE AUTORIZAÇÃO PARA INSCRIÇÃO DE VEÍCULO EM PLATAFORMA UBER

{{NOME_PROPRIETARIO}}, com sede em {{MORADA_PROPRIETARIO}}, com o número de identificação NIF {{NIF_PROPRIETARIO}}, na qualidade de único proprietário do veículo (o "Proprietário do Veículo") com a marca {{MARCA}}, modelo {{MODELO}}, matrícula {{MATRICULA}}, com data de matrícula {{DATA_MATRICULA}} (o "Veículo"), pela presente declaração autoriza a entidade {{NOME_OPERADORA}}, com sede em {{MORADA_OPERADORA}}, com o número de identificação NIPC {{NIPC_OPERADORA}}, Operadora TVDE registada e devidamente licenciada junto do Instituto da Mobilidade e dos Transportes, I.P. com o n.º de licença {{N_LICENCA}}, válida até {{VALIDADE_LICENCA_TVDE}}, aqui representada pelo seu {{REPRESENTANTE_CARGO}} {{REPRESENTANTE_NOME}} ("Operador TVDE"), a proceder à inscrição e registo do Veículo na plataforma eletrónica UBER, nos termos e para os efeitos do artigo 12.º n.º 1 da Lei n.º 45/2018, de 10 de agosto ("Lei TVDE").

{{NOME_MOTORISTA}}, residente em {{MORADA_MOTORISTA}}, portador do CC n.º {{CC}}, válido até {{VALIDADE_CC}}, com o endereço de e-mail {{EMAIL_MOTORISTA}}, motorista TVDE, devidamente licenciado junto do IMT com o certificado de motorista n.º {{CERTIFICADO_TVDE}}, declara que tomou conhecimento da presente declaração.

O Motorista declara e garante que, juntamente com o Veículo, cumpre e cumprirá durante o período da presente declaração com todos os requisitos legais e regulamentares aplicáveis, especialmente os previstos na Lei TVDE.`,
        signatures: ["NOME_PROPRIETARIO", "REPRESENTANTE_NOME", "NOME_MOTORISTA"]
    },
    comodato: {
        title: "Contrato de Comodato para Plataforma Bolt",
        fields: [
            { name: "NOME_PROPRIETARIO", label: "Nome do Proprietário do Veículo", type: "text", required: true, category: "proprietario" },
            { name: "MORADA_PROPRIETARIO", label: "Morada do Proprietário", type: "text", required: true, category: "proprietario" },
            { name: "NIF_PROPRIETARIO", label: "NIF do Proprietário", type: "text", required: true, category: "proprietario" },
            { name: "MARCA", label: "Marca do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MODELO", label: "Modelo do Veículo", type: "text", required: true, category: "veiculo" },
            { name: "MATRICULA", label: "Matrícula", type: "text", required: true, category: "veiculo" },
            { name: "DATA_MATRICULA", label: "Data de Matrícula", type: "date", required: true, category: "veiculo" },
            { name: "PRAZO_CONTRATO", label: "Prazo do Contrato", type: "text", required: true, category: "geral", default: "1 ano" },
            { name: "DATA_ASSINATURA_PROPRIETARIO", label: "Data Assinatura Proprietário", type: "date", required: true, default: new Date().toISOString().split('T')[0], category: "geral" },
            { name: "DATA_ASSINATURA_OPERADOR", label: "Data Assinatura Operador", type: "date", required: true, default: new Date().toISOString().split('T')[0], category: "geral" }
        ],
        template: `CONTRATO DE COMODATO PARA PLATAFORMA ELETRÓNICA TVDE

1. Comodante – proprietário do bem emprestado
{{NOME_PROPRIETARIO}}, com sede em {{MORADA_PROPRIETARIO}}, com o número de identificação NIF {{NIF_PROPRIETARIO}}, na qualidade de Contratante e proprietário do veículo (o "Proprietário do Veículo") com a marca {{MARCA}}, modelo {{MODELO}}, matrícula {{MATRICULA}}, com data de matrícula {{DATA_MATRICULA}} (o "Veículo"), doravante designado por Objeto, que deverá ser utilizado para o trabalho de Transporte Individual e Remunerado de Passageiros em Veículos Descaracterizados a partir de Plataforma Electrónica – TVDE, pela presente declaração autoriza a entidade Comodatário.
Durante o período do contrato, o 1.º Contratante compromete-se a manter o seguro do veículo válido.

2. Comodatário – entidade que usufrui do bem emprestado
{{NOME_OPERADOR}}, com sede em {{MORADA_OPERADOR}}, com o número de matrícula e NIPC {{NIPC_OPERADOR}}, Operadora TVDE registada e devidamente licenciada junto do IMT com o n.º de licença {{N_LICENCA}}, válida até {{VALIDADE_LICENCA_TVDE}}, aqui representada pelo seu {{REPRESENTANTE_CARGO}} {{REPRESENTANTE_NOME}}, a proceder à inscrição e registo do Veículo na plataforma eletrónica Bolt, nos termos e para os efeitos do artigo 12.º n.º 1 da Lei n.º 45/2018, de 10 de agosto ("Lei TVDE").

Condições de devolução
O Veículo deve ser devolvido no estado em que foi entregue.
O prazo do presente contrato é de {{PRAZO_CONTRATO}} a contar da data da assinatura do mesmo, não sendo em caso algum prorrogável.`,
        signatures: ["NOME_PROPRIETARIO", "REPRESENTANTE_NOME"]
    }
};