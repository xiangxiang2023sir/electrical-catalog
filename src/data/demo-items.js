/**
 * 演示物料。仅在 library/catalog.db 为空时写入，正式库请用网页增删或 npm run import-order-nos。
 */

const imgUrl = (p) => `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(p)}&image_size=square`

const rawItems = [
  // ===== 控制器类 =====
  {
    id: 1, title: "ABB IRC5 机器人控制柜", cat: "控制器类",
    desc: "ABB IRC5 标准控制柜，支持多轴运动控制，内置安全 PLC，适配 IRB 系列机器人。",
    tags: ["IRC5", "多轴", "安全PLC"], pins: "工业总线",
    skus: [{ name: "IRC5 标准控制柜", price: "¥85,000" }, { name: "IRC5 紧凑型控制柜", price: "¥62,000" }],
    img: imgUrl("ABB IRC5 industrial robot controller cabinet with orange front panel and status LEDs, product photo on plain white background")
  },
  {
    id: 2, title: "发那科 R-30iB Plus 控制柜", cat: "控制器类",
    desc: "发那科 R-30iB Plus 机器人控制柜，支持 iRVision 视觉集成，高可靠性工业级设计。",
    tags: ["R-30iB", "视觉集成", "iRVision"], pins: "工业总线",
    skus: [{ name: "R-30iB Plus 标准柜", price: "¥78,000" }],
    img: imgUrl("FANUC R-30iB Plus robot controller cabinet with blue and white industrial design, product photo on plain white background")
  },
  {
    id: 3, title: "西门子 S7-1500 CPU 1511-1 PN", cat: "控制器类",
    desc: "S7-1500 系列 CPU 模块，Profinet 接口，程序工作存储器 150KB，集成运动控制功能。",
    tags: ["S7-1500", "Profinet", "150KB"], pins: "40针",
    skus: [{ name: "6ES7511-1AK02-0AB0", price: "¥4,200" }, { name: "6ES7511-1CK01-0AB0", price: "¥3,800" }],
    img: imgUrl("Siemens S7-1500 PLC CPU module with black front panel and green status LEDs, industrial automation product photo on plain white background")
  },
  {
    id: 4, title: "西门子 S7-1500 数字量输入模块 DI16", cat: "控制器类",
    desc: "S7-1500 数字量输入模块，16 通道 24V DC，源型输入，Profinet 总线通信。",
    tags: ["S7-1500", "DI16", "24V DC"], pins: "40针",
    skus: [{ name: "6ES7521-1BH50-0AA0", price: "¥680" }],
    img: imgUrl("Siemens S7-1500 digital input module with black housing and terminal connectors, industrial product photo on plain white background")
  },
  {
    id: 5, title: "基恩士 CV-X 视觉控制器", cat: "控制器类",
    desc: "基恩士 CV-X 系列视觉控制器，支持多相机并行处理，内置高精度图像处理算法。",
    tags: ["CV-X", "多相机", "图像处理"], pins: "工业总线",
    skus: [{ name: "CV-X470F", price: "¥32,000" }, { name: "CV-X420F", price: "¥24,000" }],
    img: imgUrl("Keyence CV-X vision controller black box with multiple camera ports and status indicators, product photo on plain white background")
  },

  // ===== 动力配电类（强电） =====
  {
    id: 6, title: "施耐德 NSX100F 断路器 3P 63A", cat: "动力配电类（强电）",
    desc: "Compact NSX 系列塑壳断路器，3 极 63A，分断能力 36kA，适配工业配电柜。",
    tags: ["3P", "63A", "36kA"], pins: "3P",
    skus: [{ name: "NSX100F 3P 63A", price: "¥850" }, { name: "NSX100F 3P 100A", price: "¥920" }],
    img: imgUrl("Schneider Electric NSX100F molded case circuit breaker 3-pole black and green industrial design, product photo on plain white background")
  },
  {
    id: 7, title: "施耐德 LC1D 接触器 3P 38A", cat: "动力配电类（强电）",
    desc: "TeSys D 系列交流接触器，3 极 38A，线圈电压 220V AC，机械寿命 1000 万次。",
    tags: ["3P", "38A", "220V AC"], pins: "3P+NO+NC",
    skus: [{ name: "LC1D38M7C", price: "¥185" }],
    img: imgUrl("Schneider TeSys LC1D contactor with black housing and silver contacts, industrial electrical component product photo on plain white background")
  },
  {
    id: 8, title: "明纬 LRS-350-24 开关电源", cat: "动力配电类（强电）",
    desc: "350W 24V 直流开关电源，输入 85-264V AC，效率 88%，过载保护，自然风冷。",
    tags: ["350W", "24V DC", "85-264V AC"], pins: "端子",
    skus: [{ name: "LRS-350-24", price: "¥145" }, { name: "LRS-350-12", price: "¥135" }],
    img: imgUrl("Mean Well LRS-350-24 switch mode power supply silver metal case with terminal block, product photo on plain white background")
  },
  {
    id: 9, title: "西门子 V90 伺服驱动器 200W", cat: "动力配电类（强电）",
    desc: "SINAMICS V90 伺服驱动器，200W 功率，Profinet 总线，适配 1FL6 伺服电机。",
    tags: ["200W", "Profinet", "V90"], pins: "工业总线",
    skus: [{ name: "6SL3210-5FB10-2UA0", price: "¥2,800" }],
    img: imgUrl("Siemens SINAMICS V90 servo drive with black front panel and cooling fins, industrial product photo on plain white background")
  },
  {
    id: 10, title: "ABB 隔离变压器 5KVA", cat: "动力配电类（强电）",
    desc: "工业隔离变压器，5KVA 容量，输入 380V 输出 380V，全铜绕组，IP20 防护。",
    tags: ["5KVA", "380V", "隔离"], pins: "端子",
    skus: [{ name: "隔离变压器 5KVA", price: "¥1,850" }],
    img: imgUrl("ABB industrial isolation transformer metal enclosure with terminal block and cooling vents, product photo on plain white background")
  },

  // ===== 信号 IO 元器件 =====
  {
    id: 11, title: "欧姆龙 MY2N-J 中间继电器", cat: "信号 IO 元器件",
    desc: "MY 系列小型中间继电器，2 组转换触点，线圈 DC24V，LED 指示灯，导轨安装。",
    tags: ["DC24V", "2组", "导轨"], pins: "8脚",
    skus: [{ name: "MY2N-J DC24V", price: "¥12.5" }, { name: "MY4N-J DC24V", price: "¥18.0" }],
    img: imgUrl("Omron MY2N-J miniature relay with transparent housing and LED indicator, industrial electrical component product photo on plain white background")
  },
  {
    id: 12, title: "菲尼克斯 UK2.5B 接线端子", cat: "信号 IO 元器件",
    desc: "UK 系列螺钉式接线端子，2.5mm² 导线截面，导轨安装，灰色阻燃外壳。",
    tags: ["2.5mm²", "导轨", "阻燃"], pins: "端子",
    skus: [{ name: "UK2.5B 灰色", price: "¥2.8" }, { name: "UK3N 蓝色", price: "¥3.2" }],
    img: imgUrl("Phoenix Contact UK2.5B terminal block gray plastic with screw connection, DIN rail mount, product photo on plain white background")
  },
  {
    id: 13, title: "皮尔兹 PNOZ s4 安全继电器", cat: "信号 IO 元器件",
    desc: "PNOZsigma 系列安全继电器，3 个安全触点，符合 EN ISO 13849-1，Cat.4 PLe。",
    tags: ["3NO", "Cat.4", "PLe"], pins: "端子",
    skus: [{ name: "PNOZ s4 24VDC", price: "¥1,250" }],
    img: imgUrl("Pilz PNOZ s4 safety relay with orange housing and LED status indicators, industrial safety component product photo on plain white background")
  },
  {
    id: 14, title: "魏德米勒 VSPC 信号隔离器", cat: "信号 IO 元器件",
    desc: "VSPC 系列信号隔离器，4-20mA 输入输出，24V DC 供电，导轨安装，IP20。",
    tags: ["4-20mA", "隔离", "导轨"], pins: "端子",
    skus: [{ name: "VSPC 2SL 24VDC", price: "¥320" }],
    img: imgUrl("Weidmuller VSPC signal isolator module with gray housing and spring terminals, DIN rail mount, product photo on plain white background")
  },

  // ===== 传感器类 =====
  {
    id: 15, title: "基恩士 GL-R 安全光幕", cat: "传感器类",
    desc: "GL-R 系列安全光幕，检测高度 480mm，分辨率 14mm，响应时间 8ms，Type4。",
    tags: ["480mm", "14mm", "Type4"], pins: "M12",
    skus: [{ name: "GL-R48H", price: "¥8,500" }, { name: "GL-R64H", price: "¥10,200" }],
    img: imgUrl("Keyence GL-R safety light curtain with aluminum housing and red LED indicators, industrial safety sensor product photo on plain white background")
  },
  {
    id: 16, title: "欧姆龙 E3Z 光电开关", cat: "传感器类",
    desc: "E3Z 系列漫反射光电开关，检测距离 300mm，NPN 输出，DC24V，M18 螺纹安装。",
    tags: ["300mm", "NPN", "DC24V"], pins: "M12",
    skus: [{ name: "E3Z-D81", price: "¥85" }, { name: "E3Z-R61", price: "¥92" }],
    img: imgUrl("Omron E3Z photoelectric sensor with red LED and M18 threaded housing, industrial sensor product photo on plain white background")
  },
  {
    id: 17, title: "基恩士 CV-200C 工业相机", cat: "传感器类",
    desc: "CV-200C 彩色工业相机，200 万像素，GigE 接口，全局快门，C 口镜头。",
    tags: ["200万", "GigE", "全局快门"], pins: "GigE",
    skus: [{ name: "CV-200C", price: "¥6,800" }],
    img: imgUrl("Keyence CV-200C industrial camera with black metal housing and C-mount lens thread, product photo on plain white background")
  },
  {
    id: 18, title: "SICK DT50 激光测距传感器", cat: "传感器类",
    desc: "DT50 系列激光测距传感器，量程 10m，精度 ±3mm，模拟量 4-20mA 输出。",
    tags: ["10m", "±3mm", "4-20mA"], pins: "M12",
    skus: [{ name: "DT50-P1113", price: "¥2,400" }],
    img: imgUrl("SICK DT50 laser distance sensor with blue and black industrial housing and M12 connector, product photo on plain white background")
  },

  // ===== 操作与执行元件 =====
  {
    id: 19, title: "施耐德 XB2 急停按钮", cat: "操作与执行元件",
    desc: "XB2 系列急停按钮，红色蘑菇头，旋转复位，1NC 触点，IP65 防护等级。",
    tags: ["急停", "1NC", "IP65"], pins: "端子",
    skus: [{ name: "XB2-BS542C", price: "¥28" }, { name: "XB2-BS542C+ZB2BE101C", price: "¥45" }],
    img: imgUrl("Schneider XB2 emergency stop button red mushroom head with yellow ring base, industrial control component product photo on plain white background")
  },
  {
    id: 20, title: "SMC SY7120 电磁阀", cat: "操作与执行元件",
    desc: "SY7000 系列 5 通先导式电磁阀，DC24V，单电控，配管口径 Rc1/4，低功耗。",
    tags: ["5通", "DC24V", "Rc1/4"], pins: "DIN",
    skus: [{ name: "SY7120-5DZD-02", price: "¥165" }],
    img: imgUrl("SMC SY7120 solenoid valve with black body and silver coils, pneumatic component product photo on plain white background")
  },
  {
    id: 21, title: "SMC CDQ2B 薄型气缸", cat: "操作与执行元件",
    desc: "CDQ2B 系列薄型气缸，缸径 32mm，行程 50mm，双作用，带磁性开关槽。",
    tags: ["Φ32", "50mm", "双作用"], pins: "气管",
    skus: [{ name: "CDQ2B32-50DZ", price: "¥220" }],
    img: imgUrl("SMC CDQ2B compact pneumatic cylinder with silver aluminum body and black end caps, product photo on plain white background")
  },
  {
    id: 22, title: "施耐德 XB2 指示灯 LED 24V", cat: "操作与执行元件",
    desc: "XB2 系列 LED 指示灯，绿色，DC24V，φ22 安装孔，高亮度，寿命 10 万小时。",
    tags: ["绿色", "DC24V", "φ22"], pins: "端子",
    skus: [{ name: "XB2-BVB3LC", price: "¥15" }],
    img: imgUrl("Schneider XB2 green LED indicator light with transparent lens and chrome bezel, industrial control component product photo on plain white background")
  },

  // ===== 线缆类 =====
  {
    id: 23, title: "伺服动力电缆 4×1.5mm² 屏蔽", cat: "线缆类",
    desc: "伺服电机动力电缆，4 芯 1.5mm²，带屏蔽层，耐油 PVC 护套，拖链适用。",
    tags: ["4芯", "1.5mm²", "屏蔽"], pins: "端子",
    skus: [{ name: "动力电缆 4×1.5 屏蔽 10m", price: "¥85" }, { name: "动力电缆 4×1.5 屏蔽 20m", price: "¥160" }],
    img: imgUrl("servo motor power cable with black shielded jacket and four colored wires, industrial cable product photo on plain white background")
  },
  {
    id: 24, title: "Profinet 工业以太网线 CAT6A", cat: "线缆类",
    desc: "Profinet 工业以太网电缆，CAT6A，双屏蔽，PUR 护套，M12/RJ45 接头可选。",
    tags: ["CAT6A", "双屏蔽", "PUR"], pins: "RJ45/M12",
    skus: [{ name: "Profinet 电缆 5m", price: "¥65" }, { name: "Profinet 电缆 10m", price: "¥120" }],
    img: imgUrl("industrial Profinet Ethernet cable with green PUR jacket and metal shielded RJ45 connector, product photo on plain white background")
  },
  {
    id: 25, title: "高柔性拖链电缆 12×0.5mm²", cat: "线缆类",
    desc: "高柔性拖链专用控制电缆，12 芯 0.5mm²，TPE 护套，弯曲半径 5D，耐弯折 500 万次。",
    tags: ["12芯", "0.5mm²", "TPE"], pins: "端子",
    skus: [{ name: "拖链电缆 12×0.5 10m", price: "¥120" }],
    img: imgUrl("high-flex drag chain control cable with gray TPE jacket and multiple colored wires, industrial cable product photo on plain white background")
  },
  {
    id: 26, title: "编码器电缆 6 芯双绞屏蔽", cat: "线缆类",
    desc: "伺服编码器专用电缆，6 芯双绞屏蔽，耐油 PVC，适配增量式/绝对值编码器。",
    tags: ["6芯", "双绞", "屏蔽"], pins: "端子",
    skus: [{ name: "编码器电缆 6芯 5m", price: "¥55" }],
    img: imgUrl("encoder feedback cable with black shielded jacket and six colored twisted pair wires, industrial cable product photo on plain white background")
  },

  // ===== 辅材辅料 =====
  {
    id: 27, title: "PVC 线槽 50×25mm 灰色", cat: "辅材辅料",
    desc: "PVC 行线槽，50×25mm 截面，灰色阻燃材质，配盖板和固定座，2 米/根。",
    tags: ["50×25", "PVC", "阻燃"], pins: "无",
    skus: [{ name: "线槽 50×25 灰色 2m", price: "¥12" }],
    img: imgUrl("gray PVC cable duct trunking with snap-on cover, 50x25mm cross section, electrical wiring accessory product photo on plain white background")
  },
  {
    id: 28, title: "OT 铜鼻子 10mm² 镀锡", cat: "辅材辅料",
    desc: "OT 系列圆形裸端子，10mm² 导线截面，镀锡处理，M8 安装孔，紫铜材质。",
    tags: ["10mm²", "镀锡", "M8"], pins: "端子",
    skus: [{ name: "OT10-8 铜鼻子 100只", price: "¥35" }],
    img: imgUrl("copper cable lug terminal with tin plating and circular ring hole, electrical connector product photo on plain white background")
  },
  {
    id: 29, title: "冷压端子 E1508 管型", cat: "辅材辅料",
    desc: "管型预绝缘冷压端子，1.5mm² 导线，8mm 管长，PA66 绝缘套，紫铜管体。",
    tags: ["1.5mm²", "管型", "PA66"], pins: "端子",
    skus: [{ name: "E1508 管型端子 1000只", price: "¥28" }],
    img: imgUrl("ferrule crimp terminal with blue plastic insulation sleeve and copper tube body, electrical connector product photo on plain white background")
  },
  {
    id: 30, title: "号码管 2.5mm² 白色", cat: "辅材辅料",
    desc: "PVC 号码标识管，适配 2.5mm² 导线，白色底色黑色字符，0-9 数字组合。",
    tags: ["2.5mm²", "PVC", "白色"], pins: "无",
    skus: [{ name: "号码管 2.5 白色 500个", price: "¥18" }],
    img: imgUrl("white PVC cable marker sleeve with black printed numbers, electrical labeling accessory product photo on plain white background")
  },

  // ===== 网络通讯物料 =====
  {
    id: 31, title: "西门子 SCALANCE XC208 工业交换机", cat: "网络通讯物料",
    desc: "SCALANCE XC 系列管理型交换机，8 口 RJ45，Profinet 兼容，IP20，导轨安装。",
    tags: ["8口", "Profinet", "管理型"], pins: "RJ45",
    skus: [{ name: "6GK5208-0BA00-2AC2", price: "¥2,800" }],
    img: imgUrl("Siemens SCALANCE XC208 industrial Ethernet switch with 8 RJ45 ports and green status LEDs, DIN rail mount, product photo on plain white background")
  },
  {
    id: 32, title: "MOXA EDS-510A 工业交换机", cat: "网络通讯物料",
    desc: "EDS-510A 系列网管型交换机，8+2G 端口，冗余环网协议，-40~75℃ 宽温。",
    tags: ["8+2G", "冗余环网", "宽温"], pins: "RJ45",
    skus: [{ name: "EDS-510A-3SFP", price: "¥3,200" }],
    img: imgUrl("MOXA EDS-510A industrial managed Ethernet switch with metal case and multiple ports, product photo on plain white background")
  },
  {
    id: 33, title: "工业光纤跳线 LC-LC 单模", cat: "网络通讯物料",
    desc: "单模双芯光纤跳线，LC-LC 接头，OS2 等级，3.0mm 外护套，低插入损耗。",
    tags: ["LC-LC", "单模", "OS2"], pins: "LC",
    skus: [{ name: "光纤跳线 LC-LC 3m", price: "¥45" }, { name: "光纤跳线 LC-LC 5m", price: "¥65" }],
    img: imgUrl("industrial fiber optic patch cord with yellow jacket and blue LC duplex connectors, product photo on plain white background")
  },
  {
    id: 34, title: "光电转换器 MC210 单模", cat: "网络通讯物料",
    desc: "工业级光电转换器，1 光 1 电，单模 SC 接口，10/100M 自适应，DC24V 供电。",
    tags: ["1光1电", "SC", "10/100M"], pins: "端子",
    skus: [{ name: "MC210-SC-20", price: "¥180" }],
    img: imgUrl("industrial media converter with metal case and SC fiber optic port plus RJ45 Ethernet port, product photo on plain white background")
  },
]

const BRAND_HINTS = [
  ['ABB', 'ABB'],
  ['发那科', 'FANUC'],
  ['西门子', 'SIE'],
  ['基恩士', 'KEYENCE'],
  ['施耐德', 'SCHNEIDER'],
  ['明纬', 'MEAN WELL'],
  ['欧姆龙', 'OMRON'],
  ['菲尼克斯', 'PHOENIX'],
  ['皮尔兹', 'PILZ'],
  ['魏德米勒', 'WEIDMUELLER'],
  ['SICK', 'SICK'],
  ['SMC', 'SMC'],
  ['MOXA', 'MOXA'],
]

function guessBrand(title) {
  const hit = BRAND_HINTS.find(([k]) => String(title).includes(k))
  return hit ? hit[1] : ''
}

export const demoItems = rawItems.map((item) => ({
  ...item,
  brand: item.brand || guessBrand(item.title),
  model: item.model || item.skus?.[0]?.name || '',
  orderNo: item.orderNo || `DEMO-${String(item.id).padStart(6, '0')}`,
  unit: item.unit || 'EA',
  price: item.price || item.skus?.[0]?.price || '',
}))
