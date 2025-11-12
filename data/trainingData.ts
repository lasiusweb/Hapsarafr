import { TrainingModule } from '../types';

export const SAMPLE_TRAINING_MODULES: Omit<TrainingModule, 'tenantId' | 'createdAt' | 'updatedAt'>[] = [
    {
        id: 'module_fertilizer_basics',
        title: 'Basics of Fertilizer Application',
        description: 'Learn the right way to apply fertilizers to young oil palm plants for optimal growth.',
        moduleType: 'article',
        content: `
### Understanding the Needs of Young Palms
Young oil palm trees (1-3 years after planting) have specific nutritional needs. The goal is to encourage strong root development and healthy frond growth.

### Key Nutrients
* **Nitrogen (N):** Promotes leafy growth.
* **Phosphorus (P):** Essential for root development.
* **Potassium (K):** Crucial for fruit production and overall health.

### Recommended Application (Year 1)
* **Frequency:** Apply fertilizer every 3 months.
* **Dosage per plant:**
  * 400g of Urea (N)
  * 200g of Rock Phosphate (P)
  * 400g of Muriate of Potash (K)
* **Method:**
  1. Clear a 1-meter circle around the base of the palm, removing all weeds.
  2. Spread the fertilizer evenly within this circle.
  3. Gently mix the fertilizer into the topsoil.
  4. If possible, apply during the rainy season or ensure the area is well-irrigated after application.

**Important:** Never apply fertilizer directly touching the base of the palm as it can cause "burning" and damage the plant.
        `,
        durationMinutes: 5,
    },
    {
        id: 'module_pest_control',
        title: 'Identifying Common Pests',
        description: 'A video guide to identifying and managing common pests like the Rhinoceros Beetle.',
        moduleType: 'video',
        content: 'https://www.youtube.com/embed/Sc6a_q52j2s', // Example YouTube embed URL
        durationMinutes: 8,
    },
    {
        id: 'module_intercropping',
        title: 'Benefits of Intercropping',
        description: 'Explore how intercropping during the gestation period can improve soil health and provide additional income.',
        moduleType: 'article',
        content: `
### What is Intercropping?
Intercropping is the practice of growing two or more crops in close proximity. In oil palm plantations, this is highly recommended during the first 3-4 years (the gestation period) before the palms form a dense canopy.

### Suitable Intercrops
* Legumes: Groundnut, Mung bean, Cowpea
* Vegetables: Cucumber, Gourds, Amaranthus
* Others: Maize, Ginger, Turmeric

**Avoid:** Crops that grow tall and may compete with the young palms for sunlight, like sugarcane.

### Key Benefits
1. **Weed Suppression:** Cover crops reduce the growth of unwanted weeds, saving on labor and herbicides.
2. **Soil Health:** Leguminous crops fix nitrogen in the soil, naturally enriching it.
3. **Additional Income:** Provides an income stream for the farmer before the oil palms start producing fruit.
4. **Improved Water Retention:** The ground cover helps reduce water evaporation from the soil.
        `,
        durationMinutes: 6,
    },
];