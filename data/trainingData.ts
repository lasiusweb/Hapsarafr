import { TrainingModule } from '../types';

export const SAMPLE_TRAINING_MODULES: Omit<TrainingModule, 'id'|'sortOrder'>[] = [
    {
        title: "Introduction to Oil Palm Fertilization",
        category: "Fertilization",
        description: "Learn the basics of nutrient management for healthy oil palm growth, focusing on the essential N, P, and K ratios.",
        durationMinutes: 15,
        moduleType: 'video',
        content: 'https://www.youtube.com/embed/Scqs9y9hG_A',
        difficulty: 'Beginner',
    },
    {
        title: "Advanced Pest Control Techniques",
        category: "Pest Control",
        description: "Identify and manage common pests in oil palm plantations, including the Rhinoceros Beetle and Bagworms, using integrated pest management (IPM) strategies.",
        durationMinutes: 25,
        moduleType: 'article',
        content: `
## Integrated Pest Management (IPM) for Oil Palm

### 1. Rhinoceros Beetle (Oryctes rhinoceros)
The rhinoceros beetle is a major pest that damages the spear leaf of young palms, leading to stunted growth. 
*   **Control Measures:**
    *   Use pheromone traps to monitor and capture adult beetles.
    *   Practice good field sanitation by removing rotting palm logs and stumps, which are breeding grounds.
    *   Introduce biological control agents like the Green Muscardine Fungus (Metarhizium anisopliae).

### 2. Bagworms (Metisa plana)
Bagworms feed on the leaves, causing severe defoliation which can significantly reduce yield.
*   **Control Measures:**
    *   Encourage beneficial insects that prey on bagworms.
    *   Apply selective bio-pesticides like Bacillus thuringiensis (Bt).
    *   In severe cases, trunk injection with approved insecticides may be necessary.
        `,
        difficulty: 'Advanced',
    },
    {
        title: "Best Practices for Harvesting",
        category: "Best Practices",
        description: "Techniques for efficient and safe harvesting of fresh fruit bunches (FFB) to ensure maximum oil yield and quality.",
        durationMinutes: 20,
        moduleType: 'video',
        content: 'https://www.youtube.com/embed/uWg7_9A4h-U',
        difficulty: 'Intermediate',
    },
    {
        title: "Understanding Soil Health",
        category: "Fertilization",
        description: "A comprehensive guide to soil testing, understanding pH levels, and using organic amendments to improve long-term yield and sustainability.",
        durationMinutes: 30,
        moduleType: 'article',
        content: `
## The Importance of Soil pH in Oil Palm Cultivation

Optimal soil pH for oil palm is between **4.5 and 6.5**. Soil pH affects nutrient availability. 
*   If the pH is too low (acidic), essential nutrients like phosphorus and magnesium become less available.
*   If the pH is too high (alkaline), micronutrients like iron and manganese may become deficient.

### Correcting Soil pH
*   **For acidic soils (pH < 4.5):** Apply ground magnesium limestone (GML) or dolomite.
*   **For alkaline soils (pH > 6.5):** Application of elemental sulfur or ammonium sulfate can help lower the pH over time.

Regular soil testing every 2-3 years is crucial for maintaining optimal nutrient levels and pH balance.
        `,
        difficulty: 'Intermediate',
    },
    {
        title: "Water Management and Irrigation",
        category: "Best Practices",
        description: "Learn about efficient water usage, including drip irrigation and water harvesting techniques, to ensure consistent growth, especially during dry seasons.",
        durationMinutes: 18,
        moduleType: 'video',
        content: 'https://www.youtube.com/embed/zI-MIApWire',
        difficulty: 'Beginner',
    }
];
