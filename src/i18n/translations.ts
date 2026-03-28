export type Lang = 'zh' | 'en';

const translations = {
  nav: {
    home: { zh: '首页', en: 'Home' },
    services: { zh: '服务', en: 'Services' },
    about: { zh: '关于我们', en: 'About' },
    testimonials: { zh: '客户评价', en: 'Testimonials' },
    contact: { zh: '联系我们', en: 'Contact' },
    getQuote: { zh: '免费报价', en: 'Get a Quote' },
  },
  hero: {
    headlineBefore: {
      zh: '城市居住，',
      en: 'Urban living, ',
    },
    headlineAccent: {
      zh: '化繁为简。',
      en: 'simplified.',
    },
    subtitle: {
      zh: 'VersaHome 是一家领先的一站式房产生活服务平台，致力于简化城市居住体验。以高品质租赁管理为核心，深度整合专业软装设计、深度保洁以及高效维保服务。',
      en: 'VersaHome is a comprehensive property management and "Living-as-a-Service" platform dedicated to simplifying the urban housing experience with premium rental, bespoke furnishing, professional cleaning, and proactive maintenance.',
    },
    cta: { zh: '了解我们的服务', en: 'Explore Our Services' },
    ctaSecondary: { zh: '联系我们', en: 'Contact Us' },
  },
  services: {
    sectionTitle: {
      zh: '一站式房产生活服务',
      en: 'All-in-One Living Services',
    },
    sectionSubtitle: {
      zh: '从高品质租赁到专业软装，从深度保洁到高效维保 — 为租客打造"拎包入住"的便捷生活，为业主实现资产增值的无忧托管。',
      en: 'From premium rental management to bespoke furnishing, professional cleaning to proactive maintenance — a turnkey solution for tenants and effortless asset optimization for owners.',
    },
    rental: {
      title: { zh: '高品质租赁管理', en: 'Premium Rental Management' },
      description: {
        zh: '我们的核心业务。为业主提供全方位租赁托管服务，从租客筛选、合同管理到日常运营，实现资产的无忧增值。',
        en: 'Our core expertise. Full-service rental management for property owners — from tenant screening and contract management to daily operations, ensuring effortless asset optimization.',
      },
    },
    furnishing: {
      title: { zh: '专业软装设计', en: 'Bespoke Furnishing' },
      description: {
        zh: '量身定制的软装方案，将空置房产打造成温馨舒适的理想居所。提升房产价值，吸引优质租客。',
        en: 'Tailored furnishing solutions that transform vacant properties into warm, inviting homes. Elevate property value and attract quality tenants.',
      },
    },
    cleaning: {
      title: { zh: '深度保洁服务', en: 'Professional Cleaning' },
      description: {
        zh: '涵盖家居基础清洁、办公室清洁、深度大扫除及搬迁清洁。专业团队确保每个空间洁净如新。',
        en: 'Comprehensive home cleaning, office cleaning, deep spring cleaning, and move-in/out cleaning. Our professional team ensures every space is spotless.',
      },
    },
    maintenance: {
      title: { zh: '高效维保服务', en: 'Proactive Maintenance' },
      description: {
        zh: '7×24小时响应的维护保养服务。从日常维修到紧急处理，确保您的房产始终保持最佳状态。',
        en: '24/7 responsive maintenance service. From routine repairs to emergency handling, keeping your property in optimal condition at all times.',
      },
    },
  },
  about: {
    title: {
      zh: '关于 VersaHome',
      en: 'About VersaHome',
    },
    subtitle: {
      zh: '不只是租赁，更是一种生活方式。',
      en: 'More than rental — a lifestyle.',
    },
    p1: {
      zh: 'VersaHome 不仅提供租赁空间，更通过全方位的管家式服务，为租客打造"拎包入住"的便捷生活，同时为业主实现资产增值的无忧托管。',
      en: 'VersaHome doesn\'t just provide rental spaces — we deliver a complete concierge experience. Tenants enjoy turnkey move-in convenience, while owners benefit from effortless asset management and appreciation.',
    },
    p2: {
      zh: '我们深耕吉隆坡核心地段，在 Razak City Residences、Sunway Velocity 2、Cubic Botanical 及 Trion KL 等优质项目中，持续为住户和业主创造价值。',
      en: 'We operate in prime Kuala Lumpur locations — Razak City Residences, Sunway Velocity 2, Cubic Botanical, and Trion KL — continuously creating value for residents and property owners alike.',
    },
    stats: {
      stat1: { value: '4', label: { zh: '核心服务', en: 'Core Services' } },
      stat2: { value: '24/7', label: { zh: '全天候服务', en: 'Availability' } },
      stat3: { value: '4', label: { zh: '服务楼盘', en: 'Locations' } },
    },
  },
  testimonials: {
    title: {
      zh: '客户的心声',
      en: 'What Our Clients Say',
    },
    items: [
      {
        quote: {
          zh: 'VersaHome 的一站式服务让我省心了太多。从软装到保洁到维修，全部帮我打理好，租金收益也非常稳定。',
          en: 'VersaHome\'s all-in-one service saved me so much hassle. From furnishing to cleaning to repairs, everything is taken care of, and my rental income is very stable.',
        },
        name: { zh: '陈先生', en: 'Mr. Chen' },
        role: { zh: 'Razak City 业主', en: 'Razak City Owner' },
      },
      {
        quote: {
          zh: '搬入VersaHome管理的公寓，真的是"拎包入住"。家具齐全，环境整洁，有问题随时响应，住着很安心。',
          en: 'Moving into a VersaHome-managed apartment was truly turnkey. Fully furnished, spotlessly clean, and any issues are resolved promptly. Very reassuring.',
        },
        name: { zh: '林小姐', en: 'Ms. Lim' },
        role: { zh: 'Sunway Velocity 2 租客', en: 'Sunway Velocity 2 Tenant' },
      },
      {
        quote: {
          zh: '深度清洁的效果让我非常满意，连橱柜里面都擦得干干净净。服务团队准时、专业、细心。',
          en: 'The deep cleaning results were outstanding — even cabinet interiors were spotless. The team was punctual, professional, and meticulous.',
        },
        name: { zh: '张太太', en: 'Mrs. Zhang' },
        role: { zh: '保洁服务客户', en: 'Cleaning Service Client' },
      },
    ],
  },
  contact: {
    title: {
      zh: '联系我们',
      en: 'Contact Us',
    },
    subtitle: {
      zh: '随时与我们取得联系，获取免费咨询与报价。',
      en: 'Get in touch anytime for a free consultation and quote.',
    },
    companyName: 'Versa Home Sdn Bhd',
    locations: {
      title: { zh: '服务楼盘', en: 'Our Locations' },
      list: ['Razak City Residences', 'Sunway Velocity 2', 'Cubic Botanical', 'Trion KL'],
    },
    hours: {
      title: { zh: '营业时间', en: 'Business Hours' },
      value: { zh: '全年无休 7 × 24 小时', en: '7 × 24 Hours' },
    },
    address: {
      title: { zh: '办公地址', en: 'Office Address' },
      lines: [
        'D1-47-05, Razak City Residences 1',
        'Jalan Razak Mansion, Sg. Besi',
        '57100 Kuala Lumpur',
      ],
    },
    phone: {
      title: { zh: '商务电话', en: 'Business Contact' },
      value: '012 828 7799',
      link: 'tel:+60128287799',
    },
    whatsapp: {
      title: 'WhatsApp',
      value: '011 3303 3319',
      link: 'https://wa.me/601133033319',
    },
    email: {
      title: { zh: '电子邮件', en: 'Email' },
      value: 'sales@versahome.com.my',
      link: 'mailto:sales@versahome.com.my',
    },
    wechat: {
      title: { zh: '微信', en: 'WeChat' },
      id: 's0128287799',
    },
    xiaohongshu: {
      title: { zh: '小红书', en: 'RedNote (XHS)' },
      id: 'V_01133033319',
    },
    scanToConnect: {
      zh: '扫码关注',
      en: 'Scan to connect',
    },
  },
  cta: {
    title: {
      zh: '准备好简化您的居住体验了吗？',
      en: 'Ready to simplify your living experience?',
    },
    subtitle: {
      zh: '无论您是寻找理想居所的租客，还是希望资产增值的业主，VersaHome 都是您的最佳选择。',
      en: 'Whether you\'re a tenant seeking the perfect home or an owner looking for effortless asset growth, VersaHome is your answer.',
    },
    button: { zh: 'WhatsApp 联系', en: 'WhatsApp Us' },
    manage: { zh: '管理系统', en: 'Management' },
  },
  footer: {
    tagline: {
      zh: '一站式房产生活服务平台。租赁管理 · 软装设计 · 深度保洁 · 高效维保',
      en: 'All-in-one property living platform. Rental · Furnishing · Cleaning · Maintenance',
    },
    copyright: {
      zh: '版权所有',
      en: 'All rights reserved',
    },
  },
} as const;

export default translations;
