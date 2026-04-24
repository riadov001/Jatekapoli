import { db } from "./index";
import {
  categoriesTable,
  adsTable,
  shortsTable,
  restaurantsTable,
  menuItemsTable,
} from "./schema";

async function seedCategories() {
  console.log("🌱 Seeding categories...");
  await db.delete(categoriesTable);

  const parents = await db
    .insert(categoriesTable)
    .values([
      { name: "Restauration", slug: "restauration", icon: "restaurant", accentColor: "#B85C00", businessType: "restaurant", sortOrder: 0 },
      { name: "Épicerie", slug: "epicerie", icon: "basket", accentColor: "#2E7D32", businessType: "grocery", sortOrder: 1 },
      { name: "Santé", slug: "sante", icon: "medkit", accentColor: "#C62828", businessType: "pharmacy", sortOrder: 2 },
      { name: "Supermarché", slug: "supermarche", icon: "cart", accentColor: "#E65100", businessType: "supermarket", sortOrder: 3 },
      { name: "Boutiques", slug: "boutiques", icon: "storefront", accentColor: "#880E4F", businessType: "shop", sortOrder: 4 },
      { name: "Coursier", slug: "coursier", icon: "bicycle", accentColor: "#1A237E", businessType: "services", sortOrder: 5 },
    ])
    .returning();

  const restaurationId = parents.find((p) => p.slug === "restauration")!.id;
  const epicerieId = parents.find((p) => p.slug === "epicerie")!.id;
  const boutiqueId = parents.find((p) => p.slug === "boutiques")!.id;

  await db.insert(categoriesTable).values([
    { name: "Burgers", slug: "burgers", icon: "fast-food", accentColor: "#F57C00", parentId: restaurationId, businessType: "restaurant", sortOrder: 0 },
    { name: "Pizza", slug: "pizza", icon: "pizza", accentColor: "#D32F2F", parentId: restaurationId, businessType: "restaurant", sortOrder: 1 },
    { name: "Sushi", slug: "sushi", icon: "fish", accentColor: "#0288D1", parentId: restaurationId, businessType: "restaurant", sortOrder: 2 },
    { name: "Tacos", slug: "tacos", icon: "restaurant", accentColor: "#F9A825", parentId: restaurationId, businessType: "restaurant", sortOrder: 3 },
    { name: "Poulet", slug: "poulet", icon: "restaurant", accentColor: "#F57C00", parentId: restaurationId, businessType: "restaurant", sortOrder: 4 },
    { name: "Sandwichs", slug: "sandwichs", icon: "restaurant", accentColor: "#6D4C41", parentId: restaurationId, businessType: "restaurant", sortOrder: 5 },
    { name: "Salades", slug: "salades", icon: "leaf", accentColor: "#388E3C", parentId: restaurationId, businessType: "restaurant", sortOrder: 6 },
    { name: "Desserts", slug: "desserts", icon: "cafe", accentColor: "#7B1FA2", parentId: restaurationId, businessType: "restaurant", sortOrder: 7 },
    { name: "Fruits & Légumes", slug: "fruits-legumes", icon: "nutrition", accentColor: "#388E3C", parentId: epicerieId, businessType: "grocery", sortOrder: 0 },
    { name: "Boissons", slug: "boissons", icon: "water", accentColor: "#0277BD", parentId: epicerieId, businessType: "grocery", sortOrder: 1 },
    { name: "Snacks", slug: "snacks", icon: "fast-food", accentColor: "#EF6C00", parentId: epicerieId, businessType: "grocery", sortOrder: 2 },
    { name: "Mode", slug: "mode", icon: "shirt", accentColor: "#AD1457", parentId: boutiqueId, businessType: "shop", sortOrder: 0 },
    { name: "Électronique", slug: "electronique", icon: "phone-portrait", accentColor: "#1565C0", parentId: boutiqueId, businessType: "shop", sortOrder: 1 },
    { name: "Beauté", slug: "beaute", icon: "sparkles", accentColor: "#6A1B9A", parentId: boutiqueId, businessType: "shop", sortOrder: 2 },
  ]);

  console.log("✅ Categories seeded");
}

async function seedAds() {
  console.log("🌱 Seeding ads...");
  await db.delete(adsTable);

  await db.insert(adsTable).values([
    { type: "jatek_offer", title: "Livraisons illimitées\nsans frais", subtitle: "Abonnez-vous et économisez chaque jour", badge: "JATEK PRO", bgColor: "#E91E63", icon: "rocket", isActive: true, sortOrder: 0 },
    { type: "jatek_offer", title: "Accès prioritaire &\noffres exclusives", subtitle: "Rejoignez le club VIP et bénéficiez d'avantages uniques", badge: "JATEK VIP", bgColor: "#0A1B3D", icon: "star", isActive: true, sortOrder: 1 },
    { type: "jatek_offer", title: "L'expérience\nultime", subtitle: "Coursier dédié, support 24/7 et réductions maxi", badge: "JATEK PREMIUM", bgColor: "#7C3AED", icon: "sparkles", isActive: true, sortOrder: 2 },
    { type: "jatek_offer", title: "Livré en\n20 minutes", subtitle: "Notre réseau express pour les plus pressés", badge: "JATEK FAST", bgColor: "#EA580C", icon: "flash", isActive: true, sortOrder: 3 },
    { type: "vip_banner", title: "Jatek VIP", subtitle: "Livraison gratuite illimitée + cashback 5%", badge: "VIP", bgColor: "#0A1B3D", accentColor: "#FFD700", icon: "diamond", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80&auto=format&fit=crop", isActive: true, sortOrder: 0 },
    { type: "vip_banner", title: "Offre Ramadan", subtitle: "Jusqu'à -30% sur les menus familiaux", badge: "PROMO", bgColor: "#B85C00", accentColor: "#FFD700", icon: "star", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop", isActive: true, sortOrder: 1 },
    { type: "vip_banner", title: "Nouveaux restaurants", subtitle: "Découvrez les derniers arrivants sur Jatek", badge: "NOUVEAU", bgColor: "#1A237E", accentColor: "#E91E63", icon: "sparkles", imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80&auto=format&fit=crop", isActive: true, sortOrder: 2 },
    { type: "promo_banner", title: "-10% avec WELCOME10", subtitle: "Sur votre première commande", badge: "CODE PROMO", bgColor: "#E91E63", icon: "pricetag", isActive: true, sortOrder: 0 },
    { type: "promo_banner", title: "Livraison à 5 MAD", subtitle: "Ce week-end uniquement, commandez plus!", badge: "WEEKEND", bgColor: "#2E7D32", icon: "bicycle", isActive: true, sortOrder: 1 },
  ]);

  console.log("✅ Ads seeded");
}

async function seedShorts() {
  console.log("🌱 Seeding shorts...");
  await db.delete(shortsTable);

  await db.insert(shortsTable).values([
    { title: "Notre burger signature 🍔", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80&auto=format&fit=crop", restaurantName: "Burger Palace", isActive: true, sortOrder: 0 },
    { title: "Pizza napolitaine classique 🍕", imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80&auto=format&fit=crop", restaurantName: "La Piazza", isActive: true, sortOrder: 1 },
    { title: "Sushi platter premium 🍣", imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80&auto=format&fit=crop", restaurantName: "Tokyo Express", isActive: true, sortOrder: 2 },
    { title: "Tacos XL au poulet 🌮", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80&auto=format&fit=crop", restaurantName: "Tacos Nation", isActive: true, sortOrder: 3 },
    { title: "Salade fraîcheur du chef 🥗", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80&auto=format&fit=crop", restaurantName: "Green Bowl", isActive: true, sortOrder: 4 },
    { title: "Poulet rôti maison 🍗", imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80&auto=format&fit=crop", restaurantName: "Rôtisserie Royale", isActive: true, sortOrder: 5 },
    { title: "Smoothie bowl exotique 🍓", imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80&auto=format&fit=crop", restaurantName: "Fresh Garden", isActive: true, sortOrder: 6 },
    { title: "Wraps végétariens 🌯", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80&auto=format&fit=crop", restaurantName: "Wrap & Go", isActive: true, sortOrder: 7 },
  ]);

  console.log("✅ Shorts seeded");
}

async function seedRestaurants() {
  console.log("🌱 Seeding restaurants...");

  const existing = await db.select({ id: restaurantsTable.id }).from(restaurantsTable);
  if (existing.length > 5) {
    console.log(`⏭️  ${existing.length} restaurants already exist — skipping restaurant seed`);
    return existing.map((r) => r.id);
  }

  const restaurants = await db
    .insert(restaurantsTable)
    .values([
      {
        ownerId: 1,
        name: "Burger Palace",
        description: "Les meilleurs burgers artisanaux de la ville, faits avec des ingrédients frais chaque jour.",
        category: "restauration",
        businessType: "restaurant",
        address: "12 Rue Mohammed V, Casablanca",
        phone: "+212 6 12 34 56 78",
        imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&q=80&auto=format&fit=crop",
        rating: 4.8,
        reviewCount: 342,
        deliveryTime: 25,
        deliveryFee: 15,
        minimumOrder: 50,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "La Piazza",
        description: "Authentiques pizzas napolitaines cuites au four à bois. Pâte fine, sauce tomate San Marzano.",
        category: "restauration",
        businessType: "restaurant",
        address: "24 Boulevard Anfa, Casablanca",
        phone: "+212 6 23 45 67 89",
        imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=100&q=80&auto=format&fit=crop",
        rating: 4.7,
        reviewCount: 218,
        deliveryTime: 30,
        deliveryFee: 12,
        minimumOrder: 60,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Tokyo Express",
        description: "Sushis frais préparés par nos chefs japonais. Livraison rapide et emballage premium.",
        category: "restauration",
        businessType: "restaurant",
        address: "8 Rue Ibnou Rachiq, Casablanca",
        phone: "+212 6 34 56 78 90",
        imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=100&q=80&auto=format&fit=crop",
        rating: 4.9,
        reviewCount: 567,
        deliveryTime: 35,
        deliveryFee: 20,
        minimumOrder: 100,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Tacos Nation",
        description: "Tacos XL généreux avec viandes fraîches, sauces maison et frites croustillantes.",
        category: "restauration",
        businessType: "restaurant",
        address: "56 Avenue Hassan II, Casablanca",
        phone: "+212 6 45 67 89 01",
        imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=100&q=80&auto=format&fit=crop",
        rating: 4.5,
        reviewCount: 189,
        deliveryTime: 20,
        deliveryFee: 10,
        minimumOrder: 40,
        isOpen: true,
        isVerified: false,
      },
      {
        ownerId: 1,
        name: "Green Bowl",
        description: "Salades fraîches, bols santé et smoothies. Cuisine saine et savoureuse au quotidien.",
        category: "restauration",
        businessType: "restaurant",
        address: "33 Rue Al Amir Sultan, Casablanca",
        phone: "+212 6 56 78 90 12",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=100&q=80&auto=format&fit=crop",
        rating: 4.6,
        reviewCount: 143,
        deliveryTime: 20,
        deliveryFee: 8,
        minimumOrder: 45,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Rôtisserie Royale",
        description: "Poulet rôti entier ou en portions, marinades maison et accompagnements gourmands.",
        category: "restauration",
        businessType: "restaurant",
        address: "78 Rue Fkih Gabbas, Casablanca",
        phone: "+212 6 67 89 01 23",
        imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=100&q=80&auto=format&fit=crop",
        rating: 4.7,
        reviewCount: 201,
        deliveryTime: 25,
        deliveryFee: 12,
        minimumOrder: 55,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Wrap & Go",
        description: "Wraps gourmands, paninis chauds et sandwichs frais à emporter ou livrer.",
        category: "restauration",
        businessType: "restaurant",
        address: "14 Rue de Tanger, Casablanca",
        phone: "+212 6 78 90 12 34",
        imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=100&q=80&auto=format&fit=crop",
        rating: 4.4,
        reviewCount: 98,
        deliveryTime: 15,
        deliveryFee: 8,
        minimumOrder: 35,
        isOpen: true,
        isVerified: false,
      },
      {
        ownerId: 1,
        name: "Casa Pastilla",
        description: "Cuisine marocaine traditionnelle: tajines, couscous, bastilla et harira faits maison.",
        category: "restauration",
        businessType: "restaurant",
        address: "5 Derb Omar, Médina, Casablanca",
        phone: "+212 6 89 01 23 45",
        imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=100&q=80&auto=format&fit=crop",
        rating: 4.9,
        reviewCount: 412,
        deliveryTime: 40,
        deliveryFee: 18,
        minimumOrder: 80,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Le Coq Sportif",
        description: "Brochettes, grillades et poulet croustillant. Fast-food de qualité avec des produits locaux.",
        category: "restauration",
        businessType: "restaurant",
        address: "102 Boulevard Zerktouni, Casablanca",
        phone: "+212 6 90 12 34 56",
        imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=100&q=80&auto=format&fit=crop",
        rating: 4.3,
        reviewCount: 156,
        deliveryTime: 20,
        deliveryFee: 10,
        minimumOrder: 40,
        isOpen: true,
        isVerified: false,
      },
      {
        ownerId: 1,
        name: "Café Boulangerie Atlas",
        description: "Pains artisanaux, viennoiseries fraîches, café et petits déjeuners généreux.",
        category: "restauration",
        businessType: "restaurant",
        address: "27 Rue Patrice Lumumba, Casablanca",
        phone: "+212 6 01 23 45 67",
        imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=100&q=80&auto=format&fit=crop",
        rating: 4.6,
        reviewCount: 87,
        deliveryTime: 20,
        deliveryFee: 8,
        minimumOrder: 30,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Sushi Kyoto",
        description: "Sushis, makis et ramens authentiques. Chef japonais formé à Tokyo.",
        category: "restauration",
        businessType: "restaurant",
        address: "45 Rue Molière, Casablanca",
        phone: "+212 6 12 34 56 00",
        imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=100&q=80&auto=format&fit=crop",
        rating: 4.8,
        reviewCount: 329,
        deliveryTime: 40,
        deliveryFee: 22,
        minimumOrder: 120,
        isOpen: false,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Smoothie Bar Fresh",
        description: "Smoothies, jus frais, açaí bowls et snacks healthy pour votre énergie quotidienne.",
        category: "restauration",
        businessType: "restaurant",
        address: "9 Rue Brahim Roudani, Casablanca",
        phone: "+212 6 23 45 67 00",
        imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=100&q=80&auto=format&fit=crop",
        rating: 4.5,
        reviewCount: 74,
        deliveryTime: 15,
        deliveryFee: 6,
        minimumOrder: 25,
        isOpen: true,
        isVerified: false,
      },
      {
        ownerId: 1,
        name: "Pizza Hut Maarif",
        description: "Pizzas généreuses et desserts gourmands. Idéal pour partager en famille.",
        category: "restauration",
        businessType: "restaurant",
        address: "Centre Maarif, Casablanca",
        phone: "+212 5 22 25 40 40",
        imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=100&q=80&auto=format&fit=crop",
        rating: 4.2,
        reviewCount: 445,
        deliveryTime: 30,
        deliveryFee: 15,
        minimumOrder: 70,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Épicerie Fine Marrakchi",
        description: "Épices, huiles d'argan, olives et produits artisanaux marocains de qualité.",
        category: "epicerie",
        businessType: "grocery",
        address: "18 Rue Fal Ould Oumeir, Casablanca",
        phone: "+212 6 34 56 78 00",
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&q=80&auto=format&fit=crop",
        rating: 4.7,
        reviewCount: 63,
        deliveryTime: 25,
        deliveryFee: 10,
        minimumOrder: 50,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "Pharmamedicis",
        description: "Parapharmacie complète: cosmétiques, compléments alimentaires, soins bébé.",
        category: "sante",
        businessType: "pharmacy",
        address: "67 Avenue des FAR, Casablanca",
        phone: "+212 5 22 44 55 66",
        imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=100&q=80&auto=format&fit=crop",
        rating: 4.4,
        reviewCount: 41,
        deliveryTime: 30,
        deliveryFee: 12,
        minimumOrder: 60,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "KFC Ain Diab",
        description: "Poulet frit croustillant, burgers et menus complets. Original Recipe depuis 1952.",
        category: "restauration",
        businessType: "restaurant",
        address: "Boulevard de la Corniche, Casablanca",
        phone: "+212 5 22 79 00 00",
        imageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=100&q=80&auto=format&fit=crop",
        rating: 4.1,
        reviewCount: 892,
        deliveryTime: 25,
        deliveryFee: 12,
        minimumOrder: 50,
        isOpen: true,
        isVerified: true,
      },
      {
        ownerId: 1,
        name: "McDonald's Maarif",
        description: "Burgers, frites et McFlurry. Service rapide et menu complet pour toute la famille.",
        category: "restauration",
        businessType: "restaurant",
        address: "Rue Abdelmoumen, Casablanca",
        phone: "+212 5 22 36 01 01",
        imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80&auto=format&fit=crop",
        coverImageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&q=80&auto=format&fit=crop",
        logoUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=100&q=80&auto=format&fit=crop",
        rating: 4.0,
        reviewCount: 1240,
        deliveryTime: 20,
        deliveryFee: 10,
        minimumOrder: 40,
        isOpen: true,
        isVerified: true,
      },
    ])
    .returning();

  console.log(`✅ ${restaurants.length} restaurants seeded`);
  return restaurants.map((r) => r.id);
}

async function seedMenuItems(restaurantIds: number[]) {
  console.log("🌱 Seeding menu items...");

  const existing = await db.select({ id: menuItemsTable.id }).from(menuItemsTable);
  if (existing.length > 20) {
    console.log(`⏭️  ${existing.length} menu items already exist — skipping`);
    return;
  }

  await db.delete(menuItemsTable);

  const items = [
    // Burger Palace
    { restaurantId: restaurantIds[0], name: "Classic Burger", description: "Boeuf 180g, cheddar fondant, salade, tomate, pickles, sauce maison", price: 55, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[0], name: "Double Smash", description: "Double steak haché, double cheddar, oignons caramélisés, sauce spéciale", price: 75, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[0], name: "Crispy Chicken", description: "Poulet croustillant mariné 24h, mayo épicée, coleslaw", price: 60, category: "Burgers", imageUrl: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[0], name: "Frites Maison", description: "Pommes de terre fraîches, coupées et frites à la commande", price: 20, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[0], name: "Milkshake Vanille", description: "Lait entier, glace vanille, chantilly maison", price: 30, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[0], name: "Onion Rings", description: "Anneaux d'oignon panés et frits, sauce ranch", price: 25, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80", isAvailable: true, isPopular: false },
    // La Piazza
    { restaurantId: restaurantIds[1], name: "Margherita Classica", description: "Sauce tomate San Marzano, mozzarella di bufala, basilic frais", price: 70, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[1], name: "Quattro Formaggi", description: "Mozzarella, gorgonzola, parmesan, ricotta, miel de truffe", price: 90, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[1], name: "Diavola", description: "Tomate, mozzarella, salami piquant, piment rouge, olives noires", price: 80, category: "Pizzas", imageUrl: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[1], name: "Tiramisu", description: "Recette originale au mascarpone et café espresso", price: 35, category: "Desserts", imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[1], name: "Salade César", description: "Romaine, croûtons, parmesan, anchois, sauce césar maison", price: 50, category: "Salades", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", isAvailable: true, isPopular: false },
    // Tokyo Express
    { restaurantId: restaurantIds[2], name: "Saumon Spicy Roll (8 pcs)", description: "Saumon, avocat, concombre, sauce épicée, tobiko", price: 95, category: "Makis", imageUrl: "https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[2], name: "Plateau Mix 24 pcs", description: "Assortiment sashimis, nigiri et makis du chef", price: 180, category: "Plateaux", imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[2], name: "Ramen Tonkotsu", description: "Bouillon porc 12h, nouilles, chashu, oeuf mollet, nori", price: 85, category: "Chaud", imageUrl: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[2], name: "Edamame", description: "Fèves de soja vapeur, fleur de sel", price: 25, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[2], name: "Mochi Glacé (3 pcs)", description: "Pâte de riz gluant, glace matcha, fraise et vanille", price: 45, category: "Desserts", imageUrl: "https://images.unsplash.com/photo-1631206753348-db44968fd440?w=400&q=80", isAvailable: true, isPopular: false },
    // Tacos Nation
    { restaurantId: restaurantIds[3], name: "Tacos XL Poulet", description: "Poulet grillé, fromage fondu, sauce fromagère, frites, salade", price: 45, category: "Tacos", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[3], name: "Tacos XL Mixte", description: "Poulet + viande hachée, sauce BBQ, fromage, légumes grillés", price: 50, category: "Tacos", imageUrl: "https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[3], name: "Nuggets x10", description: "Nuggets de poulet croustillants, sauce au choix", price: 35, category: "Snacks", imageUrl: "https://images.unsplash.com/photo-1562802378-063ec186a863?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[3], name: "Frites Cheezy", description: "Frites dorées nappées de sauce fromagère chaude", price: 28, category: "Accompagnements", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[3], name: "Soda 50cl", description: "Coca, Pepsi, Fanta, Sprite ou 7Up au choix", price: 12, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80", isAvailable: true, isPopular: false },
    // Green Bowl
    { restaurantId: restaurantIds[4], name: "Buddha Bowl Quinoa", description: "Quinoa, avocat, edamame, carottes, maïs, sauce tahini", price: 65, category: "Bols", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[4], name: "Wrap Falafel", description: "Falafel croustillant, houmous, légumes grillés, sauce yaourt", price: 50, category: "Wraps", imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[4], name: "Smoothie Détox", description: "Épinards, concombre, citron, gingembre, pomme verte", price: 35, category: "Smoothies", imageUrl: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[4], name: "Açaí Bowl", description: "Base açaí, granola, fruits frais, miel, beurre de cacahuète", price: 55, category: "Bols", imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80", isAvailable: true, isPopular: true },
    // Rôtisserie Royale
    { restaurantId: restaurantIds[5], name: "Demi-poulet rôti", description: "Poulet fermier, marinade citron-herbes, frites et salade", price: 70, category: "Poulet", imageUrl: "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[5], name: "Poulet entier rôti", description: "Pour 2-3 personnes, 2 portions de frites et sauce au choix", price: 120, category: "Poulet", imageUrl: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[5], name: "Brochette Agneau x3", description: "Brochettes d'agneau épicées, pain et chermoula", price: 65, category: "Grillades", imageUrl: "https://images.unsplash.com/photo-1544025162-d76538a4d18e?w=400&q=80", isAvailable: true, isPopular: false },
    // Casa Pastilla
    { restaurantId: restaurantIds[7], name: "Tajine Agneau aux Pruneaux", description: "Agneau fondant, pruneaux, amandes grillées, épices ras el hanout", price: 120, category: "Tajines", imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[7], name: "Couscous Royal", description: "Semoule fine, légumes de saison, agneau, poulet et merguez", price: 150, category: "Couscous", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[7], name: "Bastilla au Poulet", description: "Feuilleté croustillant au poulet, amandes et cannelle", price: 85, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[7], name: "Harira + Chebakia", description: "Soupe traditionnelle + gâteau au miel de sésame", price: 45, category: "Entrées", imageUrl: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[7], name: "Thé à la Menthe", description: "Thé vert Gunpowder, menthe fraîche, sucre candi", price: 20, category: "Boissons", imageUrl: "https://images.unsplash.com/photo-1587593169894-ea6e67e69e9d?w=400&q=80", isAvailable: true, isPopular: false },
    // Café Boulangerie Atlas
    { restaurantId: restaurantIds[9], name: "Croissant Beurre", description: "Feuilletage traditionnel au beurre AOP, doré au four", price: 12, category: "Viennoiseries", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[9], name: "Café au Lait + Croissant", description: "Grand café au lait + croissant au beurre frais", price: 22, category: "Menus", imageUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80", isAvailable: true, isPopular: false },
    { restaurantId: restaurantIds[9], name: "Pain au Chocolat", description: "Feuilleté avec deux barres de chocolat noir intense", price: 14, category: "Viennoiseries", imageUrl: "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&q=80", isAvailable: true, isPopular: false },
    // Smoothie Bar Fresh
    { restaurantId: restaurantIds[11], name: "Smoothie Tropical", description: "Mangue, ananas, coco, gingembre frais, lait de coco", price: 35, category: "Smoothies", imageUrl: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[11], name: "Açaí Power Bowl", description: "Base açaí, granola, fruits frais, miel, beurre de cacahuète", price: 55, category: "Bols", imageUrl: "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80", isAvailable: true, isPopular: false },
    // Épicerie Fine
    { restaurantId: restaurantIds[13], name: "Huile d'Argan Cosmétique", description: "100% pure, première pression à froid, 100ml", price: 85, category: "Cosmétiques", imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80", isAvailable: true, isPopular: true },
    { restaurantId: restaurantIds[13], name: "Mélange Ras El Hanout", description: "Mélange 27 épices authentiques du Maroc, 100g", price: 35, category: "Épices", imageUrl: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400&q=80", isAvailable: true, isPopular: false },
  ];

  await db.insert(menuItemsTable).values(items);
  console.log(`✅ ${items.length} menu items seeded`);
}

async function main() {
  console.log("🚀 Starting Jatek seed...\n");
  try {
    await seedCategories();
    await seedAds();
    await seedShorts();
    const restaurantIds = await seedRestaurants();
    await seedMenuItems(restaurantIds);
    console.log("\n🎉 Seed complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  }
}

main();
