 <div align="center">

<img src="https://capsule-render.vercel.app/api?type=transparent&fontColor=db61a2&height=100&section=header&text=DRONE%20ROUTING%203D&fontSize=38&fontAlignY=55" width="100%" alt="Drone Routing 3D" />

### 🛸 Enrutamiento 3D Multicapa para Drones de Entrega Urbana en Loja

**Estructura de Datos · Tercer Ciclo · Unidad 1**

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-V8-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-3D%20Visualization-black?style=for-the-badge&logo=threedotjs&logoColor=white)
![Data Structures](https://img.shields.io/badge/Data%20Structures-Algorithms-A371F7?style=for-the-badge)

<br>

<img src="https://readme-typing-svg.demolab.com?font=Caveat&weight=600&size=26&pause=1200&color=A371F7&center=true&vCenter=true&width=600&height=50&lines=Exploring+the+future+of+urban+delivery;Algorithms+%7C+Data+Structures+%7C+Innovation;Optimizing+routes+in+three+dimensions+%F0%9F%9B%B8" alt="Typing animation" />

</div>

---

## 📌 Sobre el proyecto

Este proyecto propone el diseño de un sistema de planificación de trayectorias tridimensionales para drones de entrega en el casco urbano de Loja.

La solución se fundamenta en un **Grafo Multicapa 3D**, que permite representar el espacio aéreo mediante nodos y aristas con costos variables asociados al consumo energético. Además, incorpora estructuras como Octree, Colas FIFO y Min-Heap para optimizar la búsqueda de rutas, gestionar solicitudes y evitar obstáculos.

El propósito es demostrar cómo una selección adecuada de estructuras de datos permite resolver problemas reales relacionados con el rendimiento, la memoria y la eficiencia algorítmica.

## 🎯 Objetivos

- Implementar una planificación de trayectorias 3D basada en grafos multicapa.
- Aplicar Tipos de Datos Abstractos (TDA) mediante estructuras eficientes en JavaScript.
- Optimizar el uso de memoria mediante Typed Arrays y lectura de archivos por Streams.
- Evaluar el rendimiento temporal, el consumo de memoria y la precisión de las rutas.
- Visualizar las trayectorias y los obstáculos mediante Three.js.

## ⚙️ Problemática

El espacio aéreo urbano de Loja presenta diferentes alturas, edificaciones y condiciones topográficas que deben considerarse al planificar una ruta.

Una representación ineficiente de estos datos puede provocar:

- Alto consumo de memoria al almacenar miles de nodos.
- Retrasos al calcular trayectorias óptimas.
- Dificultades para detectar obstáculos tridimensionales.
- Bloqueos del Event Loop durante cálculos prolongados.
- Sobrecarga del Garbage Collector de V8.

Por ello, se plantea utilizar estructuras de datos especializadas que permitan gestionar la información de manera eficiente.

## 🧠 Estructuras de datos y algoritmos

| Estructura / Algoritmo | Aplicación en el proyecto |
|---|---|
| **Grafo Multicapa 3D** | Representar el espacio aéreo mediante nodos y aristas ponderadas. |
| **Octree** | Dividir el espacio tridimensional y detectar obstáculos. |
| **Dijkstra** | Calcular trayectorias de costo mínimo. |
| **Min-Heap** | Gestionar la cola de prioridad de Dijkstra. |
| **Cola FIFO** | Procesar solicitudes de entrega en orden de llegada. |
| **Pila** | Reconstruir la trayectoria calculada. |
| **Typed Arrays** | Almacenar coordenadas y datos de forma compacta. |
| **Streams** | Procesar archivos de mapas por fragmentos. |

## 🚀 Funcionalidades propuestas

- 🗺️ **Planificación de rutas:** calcular trayectorias minimizando el consumo energético.
- 📦 **Gestión de entregas:** atender solicitudes mediante una cola FIFO.
- 🌬️ **Condiciones ambientales:** simular penalizaciones por viento.
- 🏙️ **Detección de obstáculos:** evitar edificios y elementos del relieve mediante Octree.
- 🔋 **Consumo energético:** considerar la masa de la carga y puntos de recarga.
- 🔄 **Replanificación:** recalcular la trayectoria cuando se bloquee una arista.
- 🌐 **Visualización 3D:** representar el dron, la ruta y las métricas mediante Three.js.

## 📊 Requisitos no funcionales

| Criterio | Meta técnica |
|---|---|
| Rendimiento | Calcular rutas en grafos de hasta 10.000 nodos en menos de 2 segundos. |
| Memoria | Mantener una huella espacial O(n) mediante Typed Arrays. |
| Carga de archivos | Procesar mapas mediante Streams con consumo auxiliar O(1). |
| Precisión | Mantener márgenes de seguridad respecto a edificaciones. |
| Arquitectura | Separar las estructuras de datos en módulos independientes. |

## 🏗️ Arquitectura conceptual

El sistema relaciona las estructuras de datos con las distintas etapas de planificación:

```mermaid
flowchart TD
    A["Solicitudes de entrega"] --> B["Cola FIFO"]
    B --> C["Planificador de rutas"]
    C --> D["Grafo Multicapa 3D"]
    D --> E["Dijkstra + Min-Heap"]
    E --> F["Validación de obstáculos"]
    F --> G["Octree"]
    G --> H["Trayectoria calculada"]
    H --> I["Visualización con Three.js"]
    I --> J["Monitoreo y replanificación"]
```

## 💻 Tecnologías y herramientas

| Tecnología | Uso |
|---|---|
| JavaScript | Implementación de estructuras y algoritmos. |
| Node.js | Entorno de ejecución del sistema. |
| V8 | Motor de ejecución de JavaScript. |
| Three.js | Visualización tridimensional. |
| WebGL | Renderizado gráfico 3D. |
| Visual Studio Code | Entorno de desarrollo. |
| Git y GitHub | Control de versiones y repositorio. |

## 📁 Organización del proyecto

El diseño contempla una separación modular entre la lógica del sistema y su representación visual:

- **Lógica en Node.js:** gestión de estructuras de datos, planificación y procesamiento.
- **Visualización en Three.js:** representación del espacio aéreo, obstáculos, drones y trayectorias.
- **Gestión de archivos:** lectura de mapas y elevaciones mediante Streams.

## 👥 Integrantes

| Integrante | Participación |
|---|---|
| Ariana Quezada | Integrante del equipo |
| Kiara Condoy | Integrante del equipo |
| Mateo Pucha | Integrante del equipo |

## 📚 Información académica

- **Universidad:** Universidad Nacional de Loja.
- **Facultad:** Energía, las Industrias y los Recursos Naturales No Renovables.
- **Carrera:** Computación.
- **Asignatura:** Estructura de Datos.
- **Nivel:** Tercer ciclo.
- **Unidad:** Unidad 1 – Actividad Autónoma AA1.
- **Docente:** Ing. Cristian Narváez.
- **Grupo:** 10.
- **Período académico:** Septiembre 2026 – Febrero 2027.

## 🤖 Declaración de uso de IA

Se utilizaron herramientas de Inteligencia Artificial Generativa como apoyo en tareas de redacción, corrección gramatical y maquetación del documento. El diseño conceptual, la arquitectura del software, la selección de estructuras de datos y el análisis presentado son de autoría humana.

## 📝 Conclusiones

- La aplicación de estructuras como el Grafo Multicapa 3D, Octree, Colas FIFO y Min-Heap permite abordar los desafíos de planificación de rutas, detección de obstáculos y gestión de solicitudes.
- El uso de Typed Arrays y Streams demuestra la importancia de optimizar el almacenamiento y procesamiento de grandes cantidades de información.
- La integración de algoritmos y estructuras de datos permite plantear una solución que relaciona la eficiencia computacional con las necesidades de la logística urbana.

---

<div align="center">

### ✨ Innovación que conecta estructuras de datos con el mundo real.

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:db61a2,100:a371f7&height=100&section=footer" width="100%" alt="Footer" />

<sub>Universidad Nacional de Loja · Computación · 2026–2027</sub>

</div>
