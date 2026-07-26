import { CatalogCategory, CatalogItem } from './domain.js';
import { skillsCatalog } from './skillsCatalog.js';
import { mcpCatalog } from './mcpCatalog.js';

export const CATALOG_VERSION = '1.0.0';

export const catalogCategories: CatalogCategory[] = [
  {
    id: 'language',
    label: 'Lenguajes y runtimes',
    description: 'Lenguaje principal y runtime del proyecto.',
    multiple: true,
  },
  {
    id: 'frontend',
    label: 'Frontend web',
    description: 'Frameworks y meta-frameworks para interfaces web.',
    multiple: true,
  },
  {
    id: 'backend',
    label: 'Backend y APIs',
    description: 'Frameworks para APIs, servicios y aplicaciones de servidor.',
    multiple: true,
  },
  { id: 'mobile', label: 'Desarrollo móvil', description: 'Stacks nativos y multiplataforma.', multiple: true },
  {
    id: 'data-ai',
    label: 'Datos e IA',
    description: 'Procesamiento de datos, machine learning y agentes.',
    multiple: true,
  },
  {
    id: 'database',
    label: 'Persistencia',
    description: 'Bases relacionales, documentales, caché, búsqueda y vectores.',
    multiple: true,
  },
  {
    id: 'architecture',
    label: 'Arquitecturas',
    description: 'Estilos arquitectónicos y patrones de organización.',
    multiple: false,
  },
  {
    id: 'testing',
    label: 'Pruebas y calidad',
    description: 'Herramientas para validación funcional, estática y de seguridad.',
    multiple: true,
  },
  { id: 'cicd', label: 'CI/CD', description: 'Automatización de integración, entrega y promoción.', multiple: false },
  {
    id: 'infrastructure',
    label: 'Infraestructura como código',
    description: 'Definición reproducible de infraestructura.',
    multiple: true,
  },
  {
    id: 'container',
    label: 'Contenedores y orquestación',
    description: 'Empaquetado y operación de workloads.',
    multiple: true,
  },
  { id: 'cloud', label: 'Cloud y hosting', description: 'Proveedores y plataformas de ejecución.', multiple: true },
  {
    id: 'observability',
    label: 'Observabilidad',
    description: 'Logs, métricas, trazas y gestión de errores.',
    multiple: true,
  },
  {
    id: 'security',
    label: 'Seguridad y supply chain',
    description: 'Secretos, análisis y controles de dependencias.',
    multiple: true,
  },
  {
    id: 'repository',
    label: 'Código y colaboración',
    description: 'Repositorios, pull requests e incidencias.',
    multiple: false,
  },
  {
    id: 'agent-platform',
    label: 'Plataformas de agente',
    description: 'Formatos de configuración que generará Huascar.',
    multiple: true,
  },
  {
    id: 'knowledge',
    label: 'Conocimiento',
    description: 'Mecanismos para aportar contexto estable o recuperable.',
    multiple: true,
  },
  {
    id: 'blockchain',
    label: 'Blockchain y Web3',
    description: 'Protocolos, smart contracts y aplicaciones descentralizadas.',
    multiple: true,
  },
  {
    id: 'cybersecurity',
    label: 'Ciberseguridad',
    description: 'Herramientas ofensivas, defensivas, análisis y auditoría.',
    multiple: true,
  },
  {
    id: 'networking',
    label: 'Redes e infraestructura',
    description: 'Protocolos, SDN, service mesh y balanceo.',
    multiple: true,
  },
  {
    id: 'mlops',
    label: 'MLOps y LLMOps',
    description: 'Operaciones de modelos, serving, monitoreo y pipelines ML.',
    multiple: true,
  },
  {
    id: 'automation',
    label: 'Automatización y orquestación',
    description: 'RPA, workflows, scheduling y pipelines de automatización.',
    multiple: true,
  },
  {
    id: 'skill',
    label: 'Skills (Habilidades)',
    description: 'Rutinas reusables e instrucciones para el agente.',
    multiple: true,
  },
  {
    id: 'mcp',
    label: 'MCP Servers',
    description: 'Servidores de protocolo de contexto para el agente.',
    multiple: true,
  },
];

type ItemSpec = [id: string, label: string, description: string, tags?: string[], recommendedFor?: string[]];

function makeItems(category: string, specs: ItemSpec[]): CatalogItem[] {
  return specs.map(([id, label, description, tags = [], recommendedFor = []]) => ({
    id,
    category,
    label,
    description,
    tags,
    recommendedFor,
    environments: ['development', 'production', 'both'],
  }));
}

export const catalogItems: CatalogItem[] = [
  ...makeItems('language', [
    [
      'typescript',
      'TypeScript',
      'JavaScript tipado para frontend, backend y tooling.',
      ['node', 'web'],
      ['web', 'api', 'agent'],
    ],
    ['javascript', 'JavaScript', 'Lenguaje universal del ecosistema web y Node.js.', ['node', 'web']],
    [
      'python',
      'Python',
      'Automatización, APIs, datos, IA y scripting.',
      ['ai', 'data', 'api'],
      ['agent', 'data', 'automation'],
    ],
    [
      'java',
      'Java',
      'Servicios empresariales y plataformas de larga vida.',
      ['jvm', 'enterprise'],
      ['api', 'enterprise'],
    ],
    ['kotlin', 'Kotlin', 'JVM moderno, Android y servicios multiplataforma.', ['jvm', 'android']],
    ['csharp', 'C#/.NET', 'Aplicaciones empresariales, APIs, escritorio y cloud.', ['dotnet', 'enterprise']],
    [
      'go',
      'Go',
      'Servicios de red, plataformas cloud y herramientas DevOps.',
      ['cloud', 'systems'],
      ['microservices', 'devops'],
    ],
    ['rust', 'Rust', 'Sistemas seguros, alto rendimiento y WebAssembly.', ['systems', 'wasm']],
    ['php', 'PHP', 'Aplicaciones web y plataformas de contenido.', ['web']],
    ['ruby', 'Ruby', 'Aplicaciones web orientadas a productividad.', ['web']],
    ['swift', 'Swift', 'Aplicaciones Apple y servicios Swift.', ['ios', 'apple']],
    ['dart', 'Dart', 'Aplicaciones multiplataforma con Flutter.', ['mobile']],
    ['cpp', 'C/C++', 'Sistemas, motores y aplicaciones de alto rendimiento.', ['systems', 'embedded']],
    ['elixir', 'Elixir', 'Sistemas distribuidos y tolerantes a fallos sobre BEAM.', ['distributed', 'realtime']],
    ['assembly', 'Assembly/x86', 'Programación de bajo nivel y optimización de hardware.', ['systems', 'embedded']],
    ['zig', 'Zig', 'Sistemas modernos sin garbage collector.', ['systems']],
    ['nim', 'Nim', 'Sistemas eficientes con sintaxis expresiva.', ['systems']],
    ['scala', 'Scala', 'Programación funcional en JVM y Spark.', ['jvm', 'data'], ['data', 'enterprise']],
    ['r-lang', 'R', 'Análisis estadístico y visualización.', ['data', 'science']],
    ['julia', 'Julia', 'Computación científica de alto rendimiento.', ['science', 'data']],
    ['solidity', 'Solidity', 'Smart contracts para Ethereum/EVM.', ['blockchain']],
    ['lua', 'Lua', 'Scripting embebido y extensiones de juegos.', ['embedded', 'scripting']],
    ['haskell', 'Haskell', 'Programación funcional pura y sistemas verificables.', ['functional']],
    ['clojure', 'Clojure', 'Lisp funcional sobre JVM.', ['jvm', 'functional']],
    ['fortran', 'Fortran', 'Computación numérica y simulaciones científicas.', ['science', 'hpc']],
    ['bash', 'Bash/Shell', 'Scripting de sistema y automatización Unix.', ['scripting', 'systems']],
    ['sql', 'SQL', 'Consultas y gestión de bases de datos.', ['data', 'database']],
    ['perl', 'Perl', 'Procesamiento de texto y administración de sistemas.', ['scripting', 'systems']],
    ['vhdl', 'VHDL/Verilog', 'Diseño de hardware y FPGAs.', ['hardware', 'embedded']],
  ]),
  ...makeItems('frontend', [
    ['react', 'React', 'Biblioteca para interfaces por componentes.', ['spa'], ['web']],
    ['nextjs', 'Next.js', 'React full-stack con SSR, RSC y rutas de servidor.', ['react', 'ssr'], ['web', 'fullstack']],
    ['vue', 'Vue', 'Framework progresivo para interfaces web.', ['spa']],
    ['nuxt', 'Nuxt', 'Meta-framework Vue para SSR y aplicaciones full-stack.', ['vue', 'ssr']],
    ['angular', 'Angular', 'Framework integral para aplicaciones empresariales.', ['enterprise', 'spa']],
    ['svelte', 'Svelte', 'Framework compilado para interfaces reactivas.', ['spa']],
    ['sveltekit', 'SvelteKit', 'Aplicaciones full-stack basadas en Svelte.', ['svelte', 'ssr']],
    ['astro', 'Astro', 'Sitios orientados a contenido con islas interactivas.', ['content', 'ssg']],
  ]),
  ...makeItems('backend', [
    ['express', 'Express', 'Framework HTTP minimalista para Node.js.', ['node', 'api']],
    ['nestjs', 'NestJS', 'Backend Node modular con inyección de dependencias.', ['node', 'enterprise']],
    ['fastify', 'Fastify', 'Framework Node orientado a rendimiento y esquemas.', ['node', 'api']],
    ['fastapi', 'FastAPI', 'APIs Python tipadas y asíncronas.', ['python', 'api']],
    ['django', 'Django', 'Framework Python integral con ORM y administración.', ['python', 'web']],
    ['flask', 'Flask', 'Microframework Python flexible.', ['python', 'api']],
    ['spring-boot', 'Spring Boot', 'Servicios JVM empresariales.', ['java', 'enterprise']],
    ['quarkus', 'Quarkus', 'Java optimizado para contenedores y cloud native.', ['java', 'cloud']],
    ['aspnet-core', 'ASP.NET Core', 'APIs y aplicaciones .NET multiplataforma.', ['dotnet', 'api']],
    ['gin', 'Gin', 'Framework HTTP ligero para Go.', ['go', 'api']],
    ['laravel', 'Laravel', 'Framework PHP productivo y completo.', ['php', 'web']],
    ['rails', 'Ruby on Rails', 'Framework web convention-over-configuration.', ['ruby', 'web']],
    ['phoenix', 'Phoenix', 'Aplicaciones web y tiempo real sobre Elixir.', ['elixir', 'realtime']],
  ]),
  ...makeItems('mobile', [
    ['react-native', 'React Native', 'Aplicaciones móviles con React y código compartido.', ['ios', 'android']],
    ['flutter', 'Flutter', 'UI multiplataforma compilada desde Dart.', ['ios', 'android']],
    ['android-native', 'Android nativo', 'Aplicaciones Android con Kotlin/Java.', ['android']],
    ['ios-native', 'iOS nativo', 'Aplicaciones Apple con Swift.', ['ios']],
    ['expo', 'Expo', 'Toolchain administrado para React Native.', ['react-native']],
  ]),
  ...makeItems('data-ai', [
    ['pandas', 'Pandas', 'Manipulación y análisis tabular en Python.', ['python', 'data']],
    ['spark', 'Apache Spark', 'Procesamiento distribuido de grandes volúmenes.', ['big-data']],
    ['pytorch', 'PyTorch', 'Deep learning e investigación aplicada.', ['ml']],
    ['tensorflow', 'TensorFlow', 'Entrenamiento y serving de modelos ML.', ['ml']],
    ['langchain', 'LangChain', 'Composición de aplicaciones y agentes con LLM.', ['llm', 'agent']],
    ['llamaindex', 'LlamaIndex', 'Ingesta, indexado y recuperación para LLM.', ['llm', 'rag']],
    ['vercel-ai-sdk', 'Vercel AI SDK', 'Integración de modelos y streaming en TypeScript.', ['llm', 'typescript']],
    ['ollama', 'Ollama', 'Ejecución local de modelos abiertos.', ['llm', 'local']],
    ['scikit-learn', 'scikit-learn', 'Machine learning clásico y pipelines.', ['ml', 'python']],
    ['huggingface', 'Hugging Face Transformers', 'Modelos pre-entrenados y fine-tuning.', ['ml', 'llm']],
    ['mlflow', 'MLflow', 'Tracking, registry y serving de modelos ML.', ['mlops']],
    ['kubeflow', 'Kubeflow', 'ML pipelines en Kubernetes.', ['mlops', 'kubernetes']],
    ['ray', 'Ray', 'Computación distribuida para ML y datos.', ['ml', 'distributed']],
    ['dbt', 'dbt', 'Transformaciones SQL versionadas.', ['data', 'sql']],
    ['airflow', 'Apache Airflow', 'Orquestación de workflows de datos.', ['data', 'orchestration']],
    ['kafka', 'Apache Kafka', 'Streaming de eventos y mensajería distribuida.', ['streaming', 'distributed']],
    ['flink', 'Apache Flink', 'Procesamiento de streams en tiempo real.', ['streaming', 'distributed']],
    ['dvc', 'DVC', 'Control de versiones para datos y modelos.', ['mlops', 'versioning']],
    ['weights-biases', 'Weights & Biases', 'Experiment tracking y model registry.', ['mlops', 'tracking']],
    ['onnx', 'ONNX', 'Formato portable de modelos ML.', ['ml', 'inference']],
    ['triton', 'NVIDIA Triton', 'Inference serving de alto rendimiento.', ['ml', 'inference']],
    ['lora-finetuning', 'LoRA/QLoRA', 'Fine-tuning eficiente de LLMs.', ['llm', 'ml']],
    ['vllm', 'vLLM', 'Serving de LLMs con PagedAttention.', ['llm', 'inference']],
    ['stable-diffusion', 'Stable Diffusion', 'Generación de imágenes.', ['ml', 'generative']],
    ['opencv', 'OpenCV', 'Visión por computadora.', ['ml', 'vision']],
    ['spacy', 'spaCy', 'NLP industrial y pipelines de texto.', ['ml', 'nlp']],
  ]),
  ...makeItems('database', [
    ['postgresql', 'PostgreSQL', 'Base relacional general con extensiones avanzadas.', ['sql'], ['production']],
    ['mysql', 'MySQL/MariaDB', 'Base relacional ampliamente soportada.', ['sql']],
    [
      'sqlite',
      'SQLite',
      'Base embebida para desarrollo, edge y baja concurrencia.',
      ['sql', 'embedded'],
      ['development'],
    ],
    ['mongodb', 'MongoDB', 'Documentos JSON y esquemas flexibles.', ['nosql']],
    ['dynamodb', 'DynamoDB', 'Key-value administrado y serverless en AWS.', ['nosql', 'aws']],
    ['redis', 'Redis', 'Caché, estructuras en memoria y coordinación.', ['cache']],
    ['cassandra', 'Cassandra', 'Wide-column distribuido para alta escritura.', ['distributed']],
    ['elasticsearch', 'Elasticsearch/OpenSearch', 'Búsqueda, indexación y analítica de logs.', ['search']],
    ['pgvector', 'pgvector', 'Vectores dentro de PostgreSQL.', ['vector', 'rag']],
    ['pinecone', 'Pinecone', 'Base vectorial administrada.', ['vector', 'rag']],
    ['qdrant', 'Qdrant', 'Motor vectorial open-source y administrado.', ['vector', 'rag']],
  ]),
  ...makeItems('architecture', [
    [
      'modular-monolith',
      'Monolito modular',
      'Despliegue único con límites internos explícitos.',
      ['modular'],
      ['new-project', 'small-team'],
    ],
    ['monolith', 'Monolito tradicional', 'Aplicación única optimizada para simplicidad inicial.', ['simple']],
    [
      'microservices',
      'Microservicios',
      'Servicios desplegables de forma independiente.',
      ['distributed'],
      ['large-team', 'production'],
    ],
    [
      'serverless',
      'Serverless',
      'Funciones y servicios administrados con escalado por demanda.',
      ['cloud', 'event-driven'],
    ],
    ['event-driven', 'Event-driven', 'Componentes desacoplados por eventos y mensajería.', ['async', 'distributed']],
    ['hexagonal', 'Arquitectura hexagonal', 'Dominio aislado mediante puertos y adaptadores.', ['domain']],
    ['clean-architecture', 'Clean Architecture', 'Dependencias orientadas hacia reglas de negocio.', ['domain']],
    ['cqrs', 'CQRS', 'Modelos separados para comandos y consultas.', ['distributed', 'data']],
    ['data-pipeline', 'Pipeline de datos', 'Ingesta, transformación, calidad y publicación de datos.', ['data']],
  ]),
  ...makeItems('testing', [
    ['unit-tests', 'Pruebas unitarias', 'Validación rápida de unidades aisladas.', ['quality']],
    ['integration-tests', 'Pruebas de integración', 'Validación de límites y dependencias reales.', ['quality']],
    ['e2e-tests', 'Pruebas end-to-end', 'Validación de recorridos completos.', ['quality']],
    ['contract-tests', 'Contract testing', 'Compatibilidad entre servicios y consumidores.', ['microservices']],
    ['sast', 'SAST', 'Análisis estático de seguridad.', ['security']],
    ['dependency-scan', 'Escaneo de dependencias', 'Detección de vulnerabilidades de supply chain.', ['security']],
  ]),
  ...makeItems('cicd', [
    ['github-actions', 'GitHub Actions', 'Pipelines integrados con repositorios GitHub.', ['github']],
    ['gitlab-ci', 'GitLab CI/CD', 'Pipelines integrados con GitLab.', ['gitlab']],
    ['jenkins', 'Jenkins', 'Automatización extensible y autogestionada.', ['self-hosted']],
    ['circleci', 'CircleCI', 'CI/CD administrado y configurable.', ['managed']],
    ['azure-devops', 'Azure DevOps Pipelines', 'Pipelines y releases del ecosistema Azure.', ['azure']],
    ['argocd', 'Argo CD', 'Entrega GitOps para Kubernetes.', ['gitops', 'kubernetes']],
  ]),
  ...makeItems('infrastructure', [
    ['terraform', 'Terraform/OpenTofu', 'Infraestructura declarativa multi-cloud.', ['iac']],
    ['pulumi', 'Pulumi', 'Infraestructura como código con lenguajes generales.', ['iac']],
    ['cloudformation', 'AWS CloudFormation/CDK', 'Infraestructura nativa de AWS.', ['aws', 'iac']],
    ['bicep', 'Azure Bicep', 'Infraestructura declarativa de Azure.', ['azure', 'iac']],
    ['ansible', 'Ansible', 'Configuración y automatización de servidores.', ['configuration']],
    ['crossplane', 'Crossplane', 'Control plane multi-cloud con Kubernetes.', ['iac', 'kubernetes']],
    ['cdk', 'AWS CDK', 'Infraestructura como código en lenguajes generales.', ['aws', 'iac']],
    ['nixos', 'NixOS/Nix', 'Configuración reproducible de sistemas.', ['configuration', 'reproducible']],
  ]),
  ...makeItems('container', [
    ['docker', 'Docker', 'Empaquetado reproducible en contenedores.', ['container']],
    ['docker-compose', 'Docker Compose', 'Orquestación local y de servidor simple.', ['container']],
    ['kubernetes', 'Kubernetes', 'Orquestación de workloads distribuidos.', ['orchestration']],
    [
      'k3s',
      'K3s',
      'Kubernetes ligero para edge, IoT y clusters de bajo recurso.',
      ['kubernetes', 'lightweight', 'edge'],
    ],
    ['helm', 'Helm', 'Empaquetado y despliegue declarativo en Kubernetes.', ['kubernetes']],
    ['nomad', 'HashiCorp Nomad', 'Orquestación ligera de workloads.', ['orchestration']],
    ['podman', 'Podman', 'Contenedores rootless compatible con Docker.', ['container']],
    ['buildkit', 'BuildKit/Kaniko', 'Construcción de imágenes en CI.', ['container', 'ci']],
    ['argocd-deploy', 'Argo CD', 'Despliegue GitOps continuo.', ['gitops', 'kubernetes']],
  ]),
  ...makeItems('cloud', [
    ['aws-ec2', 'AWS EC2', 'Máquinas virtuales administradas por el equipo.', ['aws', 'vm'], ['production']],
    ['aws-ecs', 'AWS ECS/Fargate', 'Contenedores administrados en AWS.', ['aws', 'container']],
    ['aws-eks', 'AWS EKS', 'Kubernetes administrado en AWS.', ['aws', 'kubernetes']],
    ['aws-lambda', 'AWS Lambda', 'Funciones serverless en AWS.', ['aws', 'serverless']],
    ['aws-s3', 'AWS S3', 'Almacenamiento de objetos escalable y duradero.', ['aws', 'storage']],
    ['aws-rds', 'AWS RDS/Aurora', 'Bases de datos relacionales administradas.', ['aws', 'database']],
    ['aws-sqs', 'AWS SQS', 'Cola de mensajes completamente administrada.', ['aws', 'messaging']],
    ['aws-sns', 'AWS SNS', 'Pub/sub de notificaciones.', ['aws', 'messaging']],
    ['aws-eventbridge', 'AWS EventBridge', 'Bus de eventos serverless.', ['aws', 'event-driven']],
    ['aws-api-gateway', 'AWS API Gateway', 'APIs REST/HTTP/WebSocket administradas.', ['aws', 'api']],
    ['aws-cognito', 'AWS Cognito', 'Identidad y autenticación de usuarios.', ['aws', 'identity']],
    ['aws-bedrock', 'AWS Bedrock', 'Modelos fundacionales y GenAI administrado.', ['aws', 'ai']],
    ['aws-cloudfront', 'AWS CloudFront', 'CDN global de baja latencia.', ['aws', 'cdn']],
    ['aws-waf', 'AWS WAF', 'Firewall de aplicaciones web.', ['aws', 'security']],
    ['aws-guardduty', 'AWS GuardDuty', 'Detección inteligente de amenazas.', ['aws', 'security']],
    ['aws-kinesis', 'AWS Kinesis', 'Streaming de datos en tiempo real.', ['aws', 'streaming']],
    ['aws-glue', 'AWS Glue', 'ETL serverless y catálogo de datos.', ['aws', 'data']],
    ['aws-athena', 'AWS Athena', 'Consultas SQL sobre S3 sin servidor.', ['aws', 'analytics']],
    ['aws-emr', 'AWS EMR', 'Procesamiento big data con Spark/Hadoop.', ['aws', 'big-data']],
    ['aws-elasticache', 'AWS ElastiCache', 'Redis/Memcached administrado.', ['aws', 'cache']],
    ['aws-step-functions', 'AWS Step Functions', 'Orquestación de workflows serverless.', ['aws', 'orchestration']],
    ['aws-codepipeline', 'AWS CodePipeline', 'CI/CD nativo de AWS.', ['aws', 'cicd']],
    ['aws-iot-core', 'AWS IoT Core', 'Conectividad y gestión de dispositivos IoT.', ['aws', 'iot']],
    ['azure-vm', 'Azure Virtual Machines', 'Máquinas virtuales en Azure.', ['azure', 'vm']],
    ['azure-container-apps', 'Azure Container Apps', 'Contenedores serverless administrados.', ['azure', 'container']],
    ['azure-aks', 'Azure AKS', 'Kubernetes administrado en Azure.', ['azure', 'kubernetes']],
    [
      'azure-cosmos-db',
      'Azure Cosmos DB',
      'Base de datos multi-modelo distribuida globalmente.',
      ['azure', 'database'],
    ],
    ['azure-functions', 'Azure Functions', 'Funciones serverless event-driven.', ['azure', 'serverless']],
    ['azure-app-service', 'Azure App Service', 'Hosting de aplicaciones web administrado.', ['azure', 'web']],
    ['azure-service-bus', 'Azure Service Bus', 'Mensajería empresarial y colas.', ['azure', 'messaging']],
    ['azure-event-grid', 'Azure Event Grid', 'Enrutamiento de eventos reactivo.', ['azure', 'event-driven']],
    ['azure-openai', 'Azure OpenAI Service', 'Modelos GPT/DALL-E administrados por Microsoft.', ['azure', 'ai']],
    ['azure-sentinel', 'Azure Sentinel', 'SIEM y SOAR cloud-native.', ['azure', 'security']],
    ['azure-front-door', 'Azure Front Door', 'CDN y balanceo global.', ['azure', 'cdn']],
    ['azure-redis', 'Azure Cache for Redis', 'Redis administrado.', ['azure', 'cache']],
    ['azure-synapse', 'Azure Synapse Analytics', 'Data warehousing y big data unificados.', ['azure', 'analytics']],
    ['azure-data-factory', 'Azure Data Factory', 'Pipelines de integración de datos.', ['azure', 'data']],
    ['azure-devops-boards', 'Azure DevOps Boards', 'Gestión ágil de trabajo.', ['azure', 'management']],
    ['azure-iot-hub', 'Azure IoT Hub', 'Conectividad bidireccional de dispositivos IoT.', ['azure', 'iot']],
    ['gcp-compute', 'Google Compute Engine', 'Máquinas virtuales en GCP.', ['gcp', 'vm']],
    ['gcp-cloud-run', 'Google Cloud Run', 'Contenedores serverless administrados.', ['gcp', 'container']],
    ['gcp-gke', 'Google GKE', 'Kubernetes administrado en GCP.', ['gcp', 'kubernetes']],
    ['gcp-bigquery', 'Google BigQuery', 'Data warehouse serverless y analytics.', ['gcp', 'analytics']],
    ['gcp-pubsub', 'Google Pub/Sub', 'Mensajería y streaming global.', ['gcp', 'messaging']],
    ['gcp-cloud-functions', 'Google Cloud Functions', 'Funciones serverless event-driven.', ['gcp', 'serverless']],
    ['gcp-app-engine', 'Google App Engine', 'PaaS completamente administrado.', ['gcp', 'web']],
    ['gcp-firestore', 'Google Firestore', 'Base documental serverless.', ['gcp', 'database']],
    ['gcp-spanner', 'Google Cloud Spanner', 'Base relacional global y distribuida.', ['gcp', 'database']],
    ['gcp-dataflow', 'Google Dataflow', 'Procesamiento de streams y batch.', ['gcp', 'data']],
    ['gcp-dataproc', 'Google Dataproc', 'Clusters Spark/Hadoop administrados.', ['gcp', 'big-data']],
    ['gcp-cloud-armor', 'Google Cloud Armor', 'Protección DDoS y WAF.', ['gcp', 'security']],
    ['gcp-vertex-search', 'Vertex AI Search', 'Búsqueda y recuperación semántica.', ['gcp', 'ai']],
    ['gcp-cloud-sql', 'Google Cloud SQL', 'MySQL/PostgreSQL administrado.', ['gcp', 'database']],
    ['gcp-iot-core', 'Google IoT Core', 'Gestión de dispositivos IoT.', ['gcp', 'iot']],
    ['vercel', 'Vercel', 'Hosting y funciones orientadas a frontend/full-stack.', ['managed', 'web']],
    ['render', 'Render', 'Servicios, workers y bases administradas.', ['managed']],
    ['flyio', 'Fly.io', 'Aplicaciones distribuidas en máquinas ligeras.', ['managed']],
    ['vps', 'VPS/servidor propio', 'Servidor Linux administrado por el equipo.', ['vm', 'self-hosted']],
  ]),
  ...makeItems('observability', [
    ['opentelemetry', 'OpenTelemetry', 'Instrumentación estándar de métricas, logs y trazas.', ['telemetry']],
    ['prometheus-grafana', 'Prometheus + Grafana', 'Métricas y visualización open-source.', ['metrics']],
    ['cloudwatch', 'AWS CloudWatch', 'Observabilidad nativa de AWS.', ['aws']],
    ['datadog', 'Datadog', 'Observabilidad administrada full-stack.', ['managed']],
    ['sentry', 'Sentry', 'Errores, performance y releases.', ['errors']],
    ['elastic-observability', 'Elastic Observability', 'Logs, métricas, APM y búsqueda.', ['elastic']],
    ['jaeger', 'Jaeger', 'Distributed tracing open-source.', ['tracing']],
    ['loki', 'Grafana Loki', 'Agregación de logs eficiente.', ['logs']],
    ['vector-observ', 'Vector', 'Pipeline de datos de observabilidad.', ['pipeline']],
  ]),
  ...makeItems('security', [
    ['oidc', 'OIDC/OAuth 2.0', 'Identidad federada y autorización estándar.', ['identity']],
    ['secrets-manager', 'Gestor de secretos', 'Referencias de secretos fuera del código y configuración.', ['secrets']],
    ['least-privilege', 'Mínimo privilegio', 'Permisos acotados por tarea y entorno.', ['iam']],
    ['sbom', 'SBOM', 'Inventario verificable de componentes de software.', ['supply-chain']],
    ['container-scan', 'Escaneo de imágenes', 'Análisis de vulnerabilidades en contenedores.', ['container']],
    ['policy-as-code', 'Policy as Code', 'Políticas versionadas y verificables.', ['governance']],
  ]),
  ...makeItems('repository', [
    ['github', 'GitHub', 'Repositorios, issues, Actions y pull requests.', ['git']],
    ['gitlab', 'GitLab', 'Repositorios, CI/CD y merge requests.', ['git']],
    ['bitbucket', 'Bitbucket', 'Repositorios y pipelines Atlassian.', ['git']],
    ['azure-repos', 'Azure Repos', 'Repositorios del ecosistema Azure DevOps.', ['git']],
    ['local-repository', 'Repositorio local', 'Proyecto sin integración remota obligatoria.', ['local']],
  ]),
  ...makeItems('agent-platform', [
    [
      'agents-md',
      'AGENTS.md universal',
      'Estándar agnóstico interpretado por Copilot, Cursor, Zed, Aider, Warp y Gemini CLI.',
      ['agent', 'universal'],
    ],
    ['cursor', 'Cursor', 'Reglas `.cursor/rules/*.mdc` y `.cursorrules` con activación por globs.', ['agent', 'ide']],
    [
      'devin-desktop',
      'Devin Desktop',
      'Reglas `.windsurf/rules/*.md` y `.windsurfrules` para Devin Local.',
      ['agent', 'ide'],
    ],
    ['coderabbit', 'CodeRabbit', 'Configuración `.coderabbit.yaml` para auditoría async de PRs.', ['agent', 'review']],
    ['kilo-code', 'Kilo Code', 'Reglas `.kilocode/rules/*.md` y `.kilocodemodes` por roles.', ['agent', 'ide']],
    ['kiro', 'Kiro', 'Steering, hooks y skills bajo `.kiro/`.', ['agent', 'ide']],
    ['portable', 'Portable', 'Skills reutilizables y documentación independiente.', ['agent']],
  ]),
  ...makeItems('knowledge', [
    [
      'repository-docs',
      'Documentación del repositorio',
      'README, arquitectura, ADR y convenciones versionadas.',
      ['static'],
    ],
    ['source-code', 'Código fuente', 'Contexto del código y estructura del proyecto.', ['static']],
    ['web-documentation', 'Documentación web', 'Documentación externa revisada y permitida.', ['web']],
    ['tickets', 'Issues y tickets', 'Trabajo vivo desde el sistema de seguimiento.', ['dynamic']],
    ['runbooks', 'Runbooks operacionales', 'Procedimientos de operación y respuesta.', ['operations']],
    ['rag-vector-store', 'RAG vectorial', 'Corpus indexado para recuperación semántica.', ['rag']],
  ]),
  ...makeItems('blockchain', [
    ['ethereum', 'Ethereum/EVM', 'Contratos inteligentes y dApps.', ['smart-contracts']],
    ['hardhat', 'Hardhat', 'Desarrollo y testing de smart contracts.', ['smart-contracts', 'testing']],
    ['foundry', 'Foundry', 'Suite de testing rápida para Solidity.', ['smart-contracts', 'testing']],
    ['web3js', 'Web3.js/Ethers.js', 'Interacción con blockchain desde JS.', ['frontend', 'sdk']],
    ['ipfs', 'IPFS', 'Almacenamiento descentralizado.', ['storage', 'decentralized']],
    ['polygon', 'Polygon/L2', 'Redes de escalabilidad para Ethereum.', ['l2', 'scaling']],
    ['substrate', 'Substrate/Polkadot', 'Framework de blockchains custom.', ['framework']],
    ['cosmos-sdk', 'Cosmos SDK', 'Blockchains interoperables.', ['framework', 'interop']],
  ]),
  ...makeItems('cybersecurity', [
    ['burpsuite', 'Burp Suite', 'Proxy y escáner de aplicaciones web.', ['offensive', 'web']],
    ['metasploit', 'Metasploit', 'Framework de pentesting y exploits.', ['offensive']],
    ['nmap', 'Nmap', 'Escaneo de redes y puertos.', ['reconnaissance']],
    ['wireshark', 'Wireshark', 'Análisis de tráfico de red.', ['network', 'analysis']],
    ['owasp-zap', 'OWASP ZAP', 'Escáner de seguridad web open-source.', ['offensive', 'web']],
    ['snort-suricata', 'Snort/Suricata', 'IDS/IPS de red.', ['defensive', 'network']],
    ['wazuh', 'Wazuh', 'SIEM y detección de amenazas.', ['defensive', 'siem']],
    ['kali-tools', 'Kali Linux Tools', 'Suite de pentesting y auditoría.', ['offensive']],
    ['osquery', 'osquery', 'Monitoreo de endpoints como SQL.', ['defensive', 'endpoint']],
    ['vault', 'HashiCorp Vault', 'Gestión de secretos y cifrado.', ['secrets', 'defensive']],
    ['trivy', 'Trivy', 'Escaneo de vulnerabilidades de contenedores e IaC.', ['defensive', 'scanning']],
    ['falco', 'Falco', 'Detección de amenazas en runtime de contenedores.', ['defensive', 'runtime']],
    ['sonarqube', 'SonarQube', 'Análisis estático de calidad y seguridad.', ['sast', 'quality']],
  ]),
  ...makeItems('networking', [
    ['nginx', 'Nginx', 'Proxy reverso y balanceo de carga.', ['proxy', 'load-balancing']],
    ['envoy', 'Envoy', 'Service proxy para microservicios.', ['proxy', 'service-mesh']],
    ['istio', 'Istio', 'Service mesh para Kubernetes.', ['service-mesh', 'kubernetes']],
    ['consul', 'HashiCorp Consul', 'Service discovery y configuración.', ['discovery', 'configuration']],
    ['traefik', 'Traefik', 'Proxy dinámico para contenedores.', ['proxy', 'container']],
    ['wireguard', 'WireGuard', 'VPN moderna y eficiente.', ['vpn', 'security']],
    ['cloudflare', 'Cloudflare', 'CDN, DNS y protección DDoS.', ['cdn', 'security']],
  ]),
  ...makeItems('mlops', [
    ['sagemaker', 'AWS SageMaker', 'Entrenamiento y serving de modelos en AWS.', ['aws', 'training']],
    ['vertex-ai', 'Google Vertex AI', 'Plataforma ML de GCP.', ['gcp', 'training']],
    ['azure-ml', 'Azure Machine Learning', 'ML en la nube de Microsoft.', ['azure', 'training']],
    ['bentoml', 'BentoML', 'Empaquetado y serving de modelos.', ['serving']],
    ['seldon', 'Seldon Core', 'ML serving en Kubernetes.', ['serving', 'kubernetes']],
    ['evidently', 'Evidently AI', 'Monitoreo de drift y calidad de modelos.', ['monitoring']],
    ['label-studio', 'Label Studio', 'Anotación y etiquetado de datos.', ['labeling']],
    ['feast', 'Feast', 'Feature store open-source.', ['feature-store']],
  ]),
  ...makeItems('automation', [
    ['n8n', 'n8n', 'Automatización de workflows open-source.', ['workflow']],
    ['temporal', 'Temporal', 'Orquestación de workflows distribuidos duraderos.', ['workflow', 'distributed']],
    ['prefect', 'Prefect', 'Orquestación moderna de data pipelines.', ['workflow', 'data']],
    ['celery', 'Celery', 'Cola de tareas distribuida para Python.', ['queue', 'python']],
    ['bull', 'BullMQ', 'Colas de tareas para Node.js/Redis.', ['queue', 'node']],
    ['step-functions', 'AWS Step Functions', 'Workflows serverless.', ['aws', 'serverless']],
    ['github-actions-wf', 'GitHub Actions (Workflows)', 'Automatización basada en eventos.', ['ci', 'github']],
  ]),
  // `skill` and `mcp` are derived from the curated catalogs rather than
  // duplicated here. The decision tree validates `skills_selection` and
  // `mcps_selection` against these categories, so any id the /skills and /mcps
  // endpoints expose must exist here too — otherwise the UI can only offer
  // choices the tree rejects, which made both questions unanswerable.
  ...skillsCatalog.map<CatalogItem>((skill) => ({
    id: skill.id,
    category: 'skill',
    label: skill.name,
    description: skill.description,
    tags: [...skill.tags, skill.focus],
    recommendedFor: [skill.focus],
    environments: ['development', 'production', 'both'],
  })),
  ...mcpCatalog.map<CatalogItem>((mcp) => ({
    id: mcp.id,
    category: 'mcp',
    label: mcp.name,
    description: mcp.description,
    tags: [...mcp.tags, mcp.category, ...(mcp.official ? ['official'] : [])],
    recommendedFor: [mcp.category],
    environments: ['development', 'production', 'both'],
  })),
];

const itemIndex = new Map(catalogItems.map((item) => [item.id, item]));
const categoryIndex = new Map(catalogCategories.map((category) => [category.id, category]));

// #407: pre-computed, frozen response for the no-filter hot path.
const fullCatalogResponse = Object.freeze({
  version: CATALOG_VERSION,
  categories: catalogCategories,
  items: catalogItems,
  customFormat: 'custom:<slug>',
});

export function getCatalogItem(id: string): CatalogItem | undefined {
  return itemIndex.get(id);
}

export function isCatalogItemFor(id: string, categories: string[]): boolean {
  if (id.startsWith('custom:')) return /^custom:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
  const item = itemIndex.get(id);
  return !!item && categories.includes(item.category);
}

export function getCreatorCatalog(filters?: { category?: string; environment?: string; q?: string }) {
  // #407: the no-filter response is the hot path (full catalog load on
  // Creator open) and the data is immutable per deploy, so we pre-compute
  // and freeze it once. Filtered requests still pay the O(n) scan.
  if (!filters?.category && !filters?.environment && !filters?.q) {
    return fullCatalogResponse;
  }
  let items = catalogItems;
  if (filters?.category) {
    if (categoryIndex.has(filters.category)) {
      items = items.filter((item) => item.category === filters.category);
    } else {
      items = [];
    }
  }
  if (
    filters?.environment === 'development' ||
    filters?.environment === 'production' ||
    filters?.environment === 'both'
  ) {
    items = items.filter((item) =>
      item.environments.includes(filters.environment as 'development' | 'production' | 'both'),
    );
  }
  if (filters?.q) {
    const query = filters.q.toLowerCase().trim();
    items = items.filter((item) =>
      [item.id, item.label, item.description, ...item.tags].some((value) => value.toLowerCase().includes(query)),
    );
  }
  return {
    version: CATALOG_VERSION,
    categories: catalogCategories,
    items,
    customFormat: 'custom:<slug>',
  };
}
