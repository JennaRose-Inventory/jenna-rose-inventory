export const STRINGS = {
  en: {
    // App header
    appName:          "Jenna Rose",
    appSub:           "Inventory System",

    // Nav
    navCount:         "Count",
    navOverview:      "Overview",
    navHistory:       "History",
    navStats:         "Stats",
    navAI:            "AI",
    navManage:        "Manage",

    // Loading
    loading:          "Loading inventory…",

    // Count page
    filledOf:         (a, b) => `${a} / ${b} filled`,
    noItemsDay:       (day) => `No items scheduled for ${day}.`,
    saveBtn:          "Save Inventory",
    saving:           "Saving…",
    items:            "items",
    tapToSet:         "Tap to set",
    enough:           "Enough",
    needOrder:        "Need Order",

    // Overview page
    noSavedYet:       "No saved inventory yet.\nFill in Count and press Save first.",
    latest:           "latest",
    yesterday:        "yesterday",

    // History page
    searchPlaceholder:"Search item or category…",
    noMatch:          "No items match your search.",
    noHistory:        "No history yet.",
    historyFooter:    "Showing last 14 saves · oldest auto-removed",

    // Dashboard page
    noDataYet:        "No data yet. Start saving inventory counts to see analytics.",
    activeItems:      "Active Items",
    acrossCategories: (n) => `across ${n} categories`,
    lowStockNow:      "Low Stock Now",
    fromLatestSave:   "from latest save",
    totalSaves:       "Total Saves",
    allTime:          "all time",
    weeklySaveActivity: "Weekly Save Activity",
    saves:            "Saves",
    lowStockTrend:    "Low Stock Trend",
    last14Saves:      "last 14 saves",
    lowItems:         "Low items",
    mostCountedCats:  "Most Counted Categories",
    mostTrackedItems: "Most Tracked Items",
    chronicLowStock:  "Chronic Low Stock",
    byFrequency:      "by frequency",
    timesLow:         (n) => `${n}× low`,
    timesTracked:     (n) => `${n}×`,

    // Predictions page
    needMoreData:     "Need at least 3 saves to generate predictions.\nKeep saving daily!",
    tomorrowIs:       (day) => `Tomorrow is ${day}`,
    publicHoliday:    "· Public Holiday",
    weekend:          "· Weekend",
    higherDemand:     "Higher demand expected — check surge items below.",
    regularWeekday:   "Regular weekday. Predictions based on historical patterns.",
    upcomingIn:       (name, days, date) => `${name} in ${days} days (${date})`,
    stockUpBefore:    "Stock up on high-demand items before this date.",
    predictedOrder:   "Predicted Next Order",
    notEnoughPattern: (day) => `Not enough pattern data yet for ${day}.`,
    likelyRunOut:     "Likely To Run Out Soon",
    avgUsage:         (n) => `avg usage: ${n}/save`,
    stock:            "stock",
    daysLeft:         (n) => `~${n}d left`,
    weekendSurge:     "Weekend / Holiday Surge Items",
    surgePercent:     (n) => `+${n}% on weekends`,
    dayPatterns:      "Day-Specific Patterns",
    avgVal:           (n) => `avg ${n}`,
    predictionFooter: (n) => `Predictions based on ${n} historical saves · Malaysia holidays included`,
    now:              "now",
    need:             "need",
    toOrder:          (n) => `+${n} to order`,

    // Manage page
    changeInputType:  "Change Input Type",
    changeInputDesc:  "Switch an item between number count and Enough / Need Order.",
    category:         "Category",
    item:             "Item",
    inputType:        "Input Type",
    numberCount:      "Number count",
    enoughNeedOrder:  "Enough / Need Order",
    saveChange:       "Save Change",
    addNewItem:       "Add New Item",
    itemName:         "Item Name",
    typeNewItemName:  "Type new item name…",
    addItem:          "Add Item",
    archiveItem:      "Archive Item",
    archiveDesc:      "Archived items are hidden from Count and Overview but kept in History.",
    archiveConfirm:   (name) => `Archive "${name}"?`,
    alreadyExists:    "Item already exists in this category",
    addedOk:          (name) => `"${name}" added ✓`,
    updatedOk:        (name) => `"${name}" updated ✓`,
    archived:         (name) => `"${name}" archived`,

    // Toast
    savedOk:          "Inventory saved successfully!",
    saveFailed:       "Save failed. Please try again.",

    // Days
    days: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
    daysShort: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
  },

  zh: {
    // App header
    appName:          "Jenna Rose",
    appSub:           "库存系统",

    // Nav
    navCount:         "点货",
    navOverview:      "总览",
    navHistory:       "记录",
    navStats:         "统计",
    navAI:            "预测",
    navManage:        "管理",

    // Loading
    loading:          "正在加载库存…",

    // Count page
    filledOf:         (a, b) => `已填 ${a} / ${b}`,
    noItemsDay:       (day) => `${day} 没有需要点货的项目。`,
    saveBtn:          "保存库存",
    saving:           "保存中…",
    items:            "项",
    tapToSet:         "点击选择",
    enough:           "充足",
    needOrder:        "需要订货",

    // Overview page
    noSavedYet:       "还没有保存的库存记录。\n请先填写点货并按保存。",
    latest:           "最新",
    yesterday:        "昨天",

    // History page
    searchPlaceholder:"搜索项目或分类…",
    noMatch:          "没有符合搜索的项目。",
    noHistory:        "还没有记录。",
    historyFooter:    "显示最近14条记录 · 旧记录自动删除",

    // Dashboard page
    noDataYet:        "暂无数据。开始保存点货记录即可查看统计。",
    activeItems:      "活跃项目",
    acrossCategories: (n) => `共 ${n} 个分类`,
    lowStockNow:      "当前低库存",
    fromLatestSave:   "来自最新记录",
    totalSaves:       "总保存次数",
    allTime:          "累计",
    weeklySaveActivity: "每周保存次数",
    saves:            "次",
    lowStockTrend:    "低库存趋势",
    last14Saves:      "最近14次",
    lowItems:         "低库存项目",
    mostCountedCats:  "最常点货分类",
    mostTrackedItems: "最常追踪项目",
    chronicLowStock:  "长期低库存",
    byFrequency:      "按频率",
    timesLow:         (n) => `${n}次不足`,
    timesTracked:     (n) => `${n}次`,

    // Predictions page
    needMoreData:     "至少需要3次保存才能生成预测。\n请继续每天点货！",
    tomorrowIs:       (day) => `明天是${day}`,
    publicHoliday:    "· 公共假期",
    weekend:          "· 周末",
    higherDemand:     "预计需求量较高，请查看下方冲货项目。",
    regularWeekday:   "普通工作日，预测基于历史规律。",
    upcomingIn:       (name, days, date) => `${name} 还有${days}天 (${date})`,
    stockUpBefore:    "请在此日期前备好高需求物品。",
    predictedOrder:   "预测下次订货",
    notEnoughPattern: (day) => `${day} 的历史数据不足，暂无预测。`,
    likelyRunOut:     "即将用完",
    avgUsage:         (n) => `平均用量：${n}/次`,
    stock:            "库存",
    daysLeft:         (n) => `约剩${n}天`,
    weekendSurge:     "周末／假期高需求项目",
    surgePercent:     (n) => `周末高出+${n}%`,
    dayPatterns:      "每日规律",
    avgVal:           (n) => `均值 ${n}`,
    predictionFooter: (n) => `基于 ${n} 条历史记录 · 包含马来西亚假期`,
    now:              "现有",
    need:             "需要",
    toOrder:          (n) => `+${n} 需订`,

    // Manage page
    changeInputType:  "更改输入类型",
    changeInputDesc:  "切换项目在数字计数与充足／需要订货之间。",
    category:         "分类",
    item:             "项目",
    inputType:        "输入类型",
    numberCount:      "数字计数",
    enoughNeedOrder:  "充足／需要订货",
    saveChange:       "保存更改",
    addNewItem:       "添加新项目",
    itemName:         "项目名称",
    typeNewItemName:  "输入新项目名称…",
    addItem:          "添加项目",
    archiveItem:      "归档项目",
    archiveDesc:      "归档的项目将隐藏于点货和总览，但保留在记录中。",
    archiveConfirm:   (name) => `确认归档"${name}"？`,
    alreadyExists:    "该分类下已存在此项目",
    addedOk:          (name) => `"${name}" 已添加 ✓`,
    updatedOk:        (name) => `"${name}" 已更新 ✓`,
    archived:         (name) => `"${name}" 已归档`,

    // Toast
    savedOk:          "库存已成功保存！",
    saveFailed:       "保存失败，请重试。",

    // Days
    days: ["星期一","星期二","星期三","星期四","星期五","星期六","星期日"],
    daysShort: ["一","二","三","四","五","六","日"],
  },
};
