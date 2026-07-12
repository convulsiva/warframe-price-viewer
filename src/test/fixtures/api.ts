export const itemsFixture = {
  apiVersion: "0.25.0",
  data: [
    {
      id: "lex",
      slug: "lex_prime_set",
      tags: ["weapon", "prime", "set"],
      tradable: true,
      i18n: {
        en: {
          name: "Lex Prime Set",
          description: "A powerful pistol set.",
          icon: "items/images/en/lex_prime_set.png",
          thumb: "items/images/en/thumbs/lex_prime_set.128x128.png"
        },
        ru: {
          name: "Лекс Прайм: Комплект",
          description: "Комплект.",
          icon: "items/images/en/lex_prime_set.png",
          thumb: "items/images/en/thumbs/lex_prime_set.128x128.png"
        }
      }
    }
  ]
};

export const itemFixture = {
  apiVersion: "0.25.0",
  data: itemsFixture.data[0]
};

export const topOrdersFixture = {
  apiVersion: "0.25.0",
  data: {
    sell: [
      {
        id: "sell-5",
        type: "sell",
        platinum: 5,
        quantity: 1,
        perTrade: 1,
        visible: true,
        createdAt: "2026-07-08T13:06:40Z",
        updatedAt: "2026-07-08T17:16:48Z",
        itemId: "lex",
        user: {
          id: "u1",
          ingameName: "Seller",
          reputation: 5,
          platform: "pc",
          crossplay: true,
          locale: "en",
          status: "ingame",
          lastSeen: "2026-07-12T10:39:11Z"
        }
      }
    ],
    buy: [
      {
        id: "buy-3",
        type: "buy",
        platinum: 3,
        quantity: 2,
        perTrade: 1,
        visible: true,
        createdAt: "2026-07-05T13:06:40Z",
        updatedAt: "2026-07-05T17:16:48Z",
        itemId: "lex",
        user: {
          id: "u2",
          ingameName: "Buyer",
          reputation: 10,
          platform: "pc",
          crossplay: true,
          locale: "en",
          status: "ingame",
          lastSeen: "2026-07-12T10:39:11Z"
        }
      }
    ]
  }
};

export const ordersFixture = {
  apiVersion: "0.25.0",
  data: [...topOrdersFixture.data.sell, ...topOrdersFixture.data.buy]
};
