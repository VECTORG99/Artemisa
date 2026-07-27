# Politica de Seguridad

## Reportar vulnerabilidades

Si encuentras una vulnerabilidad de seguridad en Artemisa, por favor reportala abriendo un issue con el label `security` o contacta directamente a los mantenedores.

No abuses de los sistemas de reporte: no exploits, no pruebas destructivas, no acceso a datos de otros usuarios sin autorizacion.

## Expectativas

- Acusaremos recibo dentro de 48 horas
- Proveeremos una evaluacion inicial dentro de 5 dias
- Trabajaremos en una correccion segun la criticidad
- Mantendremos la comunicacion abierta durante el proceso

## Alcance

Aplica al codigo fuente, configuraciones generadas y dependencias del proyecto. No incluye servicios externos, LLM providers o plataformas de terceros configuradas por el usuario.

## Buenas practicas

- No comprometer tokens, API keys ni secretos en configuraciones
- Revisar bundles generados por el Creator antes de aplicarlos
- Usar referencias de variables de entorno en vez de valores literales
- Mantener dependencias actualizadas (`npm audit`)
