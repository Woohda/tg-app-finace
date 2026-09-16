// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatTransaction(t: any) {
  const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;

  return {
    id: t.id,
    amount: t.amount,
    type: t.type,
    name: t.name,
    date: t.date,
    created_at: t.created_at,
    categoryId: cat?.id || "",
    categoryName: cat?.name || "Неизвестно",
    categoryIcon: cat?.icon || "💸",
  };
}
