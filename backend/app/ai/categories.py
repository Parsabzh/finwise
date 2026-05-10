DEFAULT_CATEGORIES: tuple[str, ...] = (
    "salary", "freelance", "rent", "utilities", "groceries",
    "transport", "dining", "subscriptions", "health",
    "shopping", "entertainment", "education", "other",
)

CATEGORY_HINTS: dict[str, str] = {
    "salary":        "paycheck, wage, monthly income from employer",
    "freelance":     "freelance payment, consulting fee, contract work",
    "rent":          "rent, mortgage, housing payment",
    "utilities":     "electricity, water, gas bill, internet, phone",
    "groceries":     "supermarket, food store, fresh produce",
    "transport":     "bus, metro, train, taxi, rideshare, Uber, parking",
    "dining":        "restaurant, cafe, fast food, takeaway, delivery",
    "subscriptions": "Netflix, Spotify, monthly subscription, SaaS tool",
    "health":        "doctor, dentist, hospital, medical, gym, pharmacy",
    "shopping":      "online shop, Amazon, retail store, clothing, electronics",
    "entertainment": "cinema, concert, sport event, games, leisure activity",
    "education":     "school, university, online course, books, training",
    "other":         "anything that does not fit any of the above categories",
}
