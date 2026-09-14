import ExcelJS from 'exceljs'
import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = join(rootDir, 'library', '新增品牌申请_物料清单_表格.csv')
const outPath = join(rootDir, 'library', '新增品牌申请_物料清单_电气机械分类.xlsx')

export function parseCsvLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 1
        } else q = false
      } else cur += c
    } else if (c === '"') q = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

function norm(s) {
  return String(s || '').replace(/\s+/g, '').toUpperCase()
}

const ELEC_BRANDS = new Set(
  `
  SIE SIEMENS SCHNEIDER EATON PHOENIX PHOENIXCONTACT WEIDMULLER WAGO
  AB ROCKWELL ALLENBRADLEY ALLEN-BRADLEY KEYENCE SICK BANNER TURCK
  OMRON PILZ MOXA BOXCO SUNX DECOWELL TPLINK TP-LINK HARTING WAIN FAS
  INOVANCE DELTA MITSUBISHI BECKHOFF LAPP HELUKABEL RITTAL MEANWELL
  BALLUFF IFM PEPPERL PEPPERLFUCHS P+F HIK HIKVISION HERRMANN
  PILZ PEPPERL+FUCHS LEUZE DATALOGIC COGNEX IFM ELECTRONIC
  WEIDMUELLER PHOENIX-CONTACT SIEMENSAG ABBDRIVE
  MOELLER KLOCKNER SE SEW SEWEURODRIVE LENZE YASKAWA PANASONIC
  IDEC FUJI CHINT DELIXI PEOPLE TENGEN HONEYWELL
  FINDER CARLO RELECO MURR MURRELEKTRONIK HIRSCHMANN PHOENIXCONTACT
  PHOENIXCON LAPPKABEL IGUSCF
  KINCO WEINVIEW MCGS SIEMEN
  PHOENIXCONTACT WOE EUCHNER ESCHA TAYEE GONGNIU VLIGHT OPT
  TELSONIC SONOTRONIC CHANGO UGREEN ZHEDIAN EMC LAPPKABEL
  MurrElektronik MURR
  `
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
)

const MECH_BRANDS = new Set(
  `
  FESTO SMC AIRTAC MISUMI HIWIN YHD GB ITEM CRG WEYER HEHUA
  MINGSHUNDA HUAYUIR WJPJ IGUS LARK
  THK NSK SKF INA IKO NMB
  BOSCHREXROTH REXROTH PARKER NORGREN CKD
  DESTACO SCHUNK ZIMMER ONROBOT ROBOTIQ ATI STAUBLI AIGNEP
  SATA LINLONG XINGHU XINHU
  `
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
)

const ELEC_SUB = {
  controller: '控制器类',
  power: '动力配电类（强电）',
  io: '信号 IO 元器件',
  sensor: '传感器与视觉',
  operate: '操作与执行元件',
  cable: '线缆与连接器',
  net: '网络通讯物料',
  cabinet: '电气柜与安装辅材',
  drive: '驱动与伺服',
  heat: '加热与工艺电源',
  safety: '安全防护',
  other: '电气其他',
}

const MECH_SUB = {
  pneumatic: '气动元件',
  fluid: '液压与流体接头',
  fastener: '紧固件与标准件',
  profile: '型材与机架',
  linear: '直线运动与模组',
  motion: '轴承传动与机器人本体',
  chain: '拖链与护线',
  structure: '机加工与结构件',
  gripper: '夹具快换与抓手',
  consumable: '润滑密封与胶粘',
  other: '机械其他',
}

function hit(text, patterns) {
  return patterns.some((p) => (p instanceof RegExp ? p.test(text) : text.includes(p)))
}

function electricalSub(text) {
  if (hit(text, ['安全继电器', '光栅', '光幕', '急停', '安全开关', '安全门', 'PSEN', 'PNOZ', 'PILZ', 'SF4B', '安全锁'])) {
    return ELEC_SUB.safety
  }
  if (hit(text, ['红外', '灯管', '加热', '焊机', '焊接', '换能器', '超声波焊', '热流道', '加热器', '焊头', '长江焊'])) {
    return ELEC_SUB.heat
  }
  if (hit(text, ['伺服', '变频器', '驱动器', '减速电机', 'V90', 'VFD', 'INVERTER', 'SINAMICS', '电机', '马达'])) {
    return ELEC_SUB.drive
  }
  if (hit(text, ['CPU', 'PLC', '控制器', 'CONTROL', 'IM155', 'ET200', 'S7-1500', 'S71500', 'IO模块', '数字量', '模拟量', '适配器模块', '现场总线适配', 'BASEUNIT', '总线卡'])) {
    return ELEC_SUB.controller
  }
  if (hit(text, ['交换机', '路由器', '网关', '网卡', '无线', 'PROFINET', 'ETHERNET', '以太网', '串口服务器', '防火墙', 'MGUARD', 'WIFI'])) {
    return ELEC_SUB.net
  }
  if (hit(text, ['断路器', '接触器', '空开', '塑壳', '空气开关', '开关电源', '变压器', '隔离变', '滤波器', '浪涌', '配电', '主控开', 'NSX', 'LC1', '电源', 'PSU', 'SITOP', '母线', '电流互感', 'TRANSFORMER'])) {
    return ELEC_SUB.power
  }
  if (hit(text, ['相机', '视觉', '传感器', '接近', '光电', '电感', '磁开', '行程开关', '编码器', '压力变送', '流量计', '超声波传感器', '读码', 'SCANNER', '光源', '镜头', '工控机', '显示器'])) {
    return ELEC_SUB.sensor
  }
  if (hit(text, ['按钮', '指示灯', '选择开关', '旋钮', '蜂鸣', '信号灯', '三色灯', '按钮盒', '钥匙'])) {
    return ELEC_SUB.operate
  }
  if (hit(text, ['端子', '继电器', '接触器线圈', '中间继', 'IO接线', '保险丝端子', '接地端子', '隔离器'])) {
    return ELEC_SUB.io
  }
  if (hit(text, ['电缆', '网线', '电线', '航插', '插芯', '插针', '连接器', '接头', '接线盒', '拖链电缆', '柔性电缆', '高频线', '高频接头', 'M12', 'M8针', 'COLD PRESS'])) {
    return ELEC_SUB.cable
  }
  if (hit(text, ['电气柜', '电柜', 'KP柜', '配电柜', '安装板', '导轨', '线槽', '威图', 'RITTAL', '柜体', '侧板', '调试桌'])) {
    return ELEC_SUB.cabinet
  }
  return ELEC_SUB.other
}

function mechanicalSub(text) {
  if (hit(text, ['气缸', '气爪', '电磁阀', '气源', '气管', '真空', '吸盘', '调压', '油雾', '消音器', '浮动接头', 'CYLINDER', 'VALVE'])) {
    return MECH_SUB.pneumatic
  }
  if (hit(text, ['液压', '油管', '水路', '宝塔', '管接头', '螺塞', '快速接头', '水管', '冷却管', '分油'])) {
    return MECH_SUB.fluid
  }
  if (hit(text, ['螺钉', '螺母', '垫圈', '螺栓', '挡圈', '销', '平键', '紧定', 'GB/T', 'GB／T', '内六角'])) {
    return MECH_SUB.fastener
  }
  if (hit(text, ['型材', 'PROFILE', '机架', '铝型材', '框架', 'ITEM'])) {
    return MECH_SUB.profile
  }
  if (hit(text, ['导轨', '滑块', '丝杠', '模组', '直线', '滑台', 'HIWIN', 'THK'])) {
    return MECH_SUB.linear
  }
  if (hit(text, ['坦克链', '拖链', '拖链板', '分隔片'])) {
    return MECH_SUB.chain
  }
  if (hit(text, ['快换', '工具盘', '夹具', '抓手', 'GRIPPER', '夹爪', '定位器', 'MOULD'])) {
    return MECH_SUB.gripper
  }
  if (hit(text, ['轴承', '齿轮', '同步带', '皮带', '减速机', '联轴器', '机器人', 'IRB', 'FANUC'])) {
    return MECH_SUB.motion
  }
  if (hit(text, ['润滑', '密封胶', '乐泰', '油脂', '胶水'])) {
    return MECH_SUB.consumable
  }
  if (hit(text, ['按图加工', '机加', '焊接件', '折弯', '钢板', 'Q235', '支撑', '支架', '垫块', '衬套', '缓冲器'])) {
    return MECH_SUB.structure
  }
  return MECH_SUB.other
}

export function classify(row) {
  const brand = norm(row.brand).replace(/[^A-Z0-9+]/g, '')
  const text = [row.title, row.newTitle, row.oldModel, row.newSpec, row.brand].join(' ')
  const t = text.toUpperCase()

  const elecKw = hit(t, [
    '电气', '端子', '断路器', '接触器', '继电器', 'PLC', 'CPU', '电缆', '网线', '航插',
    '传感器', '光栅', '按钮', '指示灯', '交换机', '网关', '变频器', '伺服', '开关电源',
    '接线', '数字量', '模拟量', 'PROFINET', 'ETHERNET', '24VDC', '220V', '380V',
    '电柜', '电气柜', '空开', '变压器', '滤波器', '浪涌', '网卡', '路由器', '安全继电器',
    '光电', '接近开关', '编码器', '伺服驱动', 'IO模块', '插芯', '插针', 'M12电感',
    '灯管', '加热长度', '高频线', 'LEMO', '母线', '电子锁', '光源', '镜头', '焊头',
    '工控机', '单芯线', 'SENSOR CABLE', '气电滑环', '插座', '插头',
  ])
  const mechKw = hit(t, [
    '气缸', '气爪', '螺钉', '螺母', '垫圈', '铝型材', '型材', '导轨', '滑块', '丝杠',
    '轴承', '坦克链', '拖链', '宝塔接头', '按图加工', '机架', '夹具', '工具盘',
    '缓冲器', '衬套', '平键', '内六角', '液压', '吸盘', '真空发生', '同步带',
    '麻花钻', '铣刀', '丝锥', '扳手', '喉箍', '气管', '真空泵', '模温机', '冷水机',
    '联轴器', '流利条', '管线包', '铜套',
  ])

  if (hit(t, ['外借人工'])) {
    return { major: '未定义', minor: '非物料', reason: '外借人工，不是物料' }
  }

  const prefix = norm(row.orderNo).split('-')[0]
  if (['WOE'].includes(prefix) || hit(t, ['母线'])) {
    return { major: '电气', minor: ELEC_SUB.power, reason: '母线系统' }
  }
  if (['EUCHNER', 'PILZ'].includes(prefix) || hit(t, ['电子锁'])) {
    return { major: '电气', minor: ELEC_SUB.safety, reason: '安全锁/钥匙' }
  }
  if (['VLIGHT', 'OPT', 'HIK'].includes(prefix) || hit(t, ['光源', '镜头', '视觉函数'])) {
    return { major: '电气', minor: ELEC_SUB.sensor, reason: '视觉光源/镜头' }
  }
  if (['CHANGO', 'SONOTRONIC', 'TELSONIC'].includes(prefix) || hit(t, ['焊头', '换能器'])) {
    return { major: '电气', minor: ELEC_SUB.heat, reason: '焊接/超声波' }
  }
  if (['ESCHA', 'UGREEN', 'GONGNIU'].includes(prefix)) {
    return { major: '电气', minor: ELEC_SUB.cable, reason: '电缆/插座品牌' }
  }
  if (['TAYEE', 'APT'].includes(prefix) || hit(t, ['CURRENT TRANSFORMER', '互感器'])) {
    return { major: '电气', minor: electricalSub(t), reason: '按钮/互感器品牌' }
  }
  if (['AIGNEP'].includes(prefix) || hit(t, ['气管', '真空泵'])) {
    return { major: '机械', minor: MECH_SUB.pneumatic, reason: '气动接头/真空' }
  }
  if (['ATI', 'STAUBLI'].includes(prefix)) {
    return { major: '机械', minor: MECH_SUB.gripper, reason: '快换/接头' }
  }
  if (['SATA', 'XINGHU', 'XINHU', 'LINLONG'].includes(prefix) || hit(t, ['麻花钻', '铣刀', '丝锥', '扳手'])) {
    if (elecKw) return { major: '电气', minor: electricalSub(t), reason: '工具品牌里的电气件' }
    return { major: '机械', minor: MECH_SUB.other, reason: '工具/机加辅材' }
  }

  if (hit(t, ['柔性电缆', '拖链电缆', '网线', 'CF880', 'CF881']) && (brand === 'IGUS' || t.includes('IGUS'))) {
    return { major: '电气', minor: ELEC_SUB.cable, reason: '拖链电缆按电气线缆' }
  }
  if (brand === 'IGUS' || t.includes('坦克链') || t.includes('拖链')) {
    if (hit(t, ['电缆', '电线', '网线'])) {
      return { major: '电气', minor: ELEC_SUB.cable, reason: '电缆' }
    }
    return { major: '机械', minor: MECH_SUB.chain, reason: '拖链本体' }
  }

  if (brand === 'QUICKQT' || brand === 'QT') {
    if (hit(t, ['信号模块', '高频模块', '24V', '芯'])) {
      return { major: '电气', minor: ELEC_SUB.cable, reason: '快换电气模块' }
    }
    return { major: '机械', minor: MECH_SUB.gripper, reason: '快换机械盘' }
  }

  if (brand === 'HUAYUIR' || hit(t, ['灯管', '加热长度'])) {
    return { major: '电气', minor: ELEC_SUB.heat, reason: '红外/加热' }
  }

  if (brand === 'HFM' || brand === 'RUITUO' || hit(t, ['电气柜', 'KP柜', '电柜'])) {
    return { major: '电气', minor: ELEC_SUB.cabinet, reason: '电气柜组件' }
  }

  if (brand === 'WAIN' || brand === 'HARTING' || brand === 'FAS') {
    return { major: '电气', minor: electricalSub(t), reason: '连接器/传感器电缆品牌' }
  }

  if (brand === 'SEW') {
    return { major: '电气', minor: ELEC_SUB.drive, reason: 'SEW 驱动/电机' }
  }

  if (brand === 'ABB') {
    if (hit(t, ['IRB', '机器人', 'MULTIMOVE', '齿轮'])) {
      return { major: '机械', minor: MECH_SUB.motion, reason: '机器人本体' }
    }
    return { major: '电气', minor: electricalSub(t), reason: 'ABB 电气件' }
  }

  if (brand === 'GB' || hit(t, ['GB/T', 'GB／T'])) {
    return { major: '机械', minor: MECH_SUB.fastener, reason: '国标紧固件' }
  }

  if (brand === 'ITEM') {
    return { major: '机械', minor: MECH_SUB.profile, reason: 'ITEM 型材' }
  }

  if (brand === 'LARK' || brand === 'HIWIN') {
    return { major: '机械', minor: MECH_SUB.linear, reason: '直线模组/导轨' }
  }

  if (['FESTO', 'SMC', 'AIRTAC', 'CKD', 'NORGREN'].includes(brand)) {
    return { major: '机械', minor: MECH_SUB.pneumatic, reason: '气动品牌' }
  }

  if (['YHD', 'WJPJ', 'MINGSHUNDA', 'CRG', 'WEYER', 'HEHUA', 'MISUMI'].includes(brand)) {
    if (elecKw && !mechKw) {
      return { major: '电气', minor: electricalSub(t), reason: '名称偏电气' }
    }
    return { major: '机械', minor: mechanicalSub(t), reason: '结构/气动/标准件品牌' }
  }

  if (ELEC_BRANDS.has(brand) || brand.startsWith('SIEMEN') || brand === 'PHOENIX') {
    return { major: '电气', minor: electricalSub(t), reason: '电气品牌' }
  }
  if (MECH_BRANDS.has(brand)) {
    return { major: '机械', minor: mechanicalSub(t), reason: '机械品牌' }
  }

  if (elecKw && !mechKw) return { major: '电气', minor: electricalSub(t), reason: '名称关键词' }
  if (mechKw && !elecKw) return { major: '机械', minor: mechanicalSub(t), reason: '名称关键词' }
  if (elecKw && mechKw) {
    return { major: '电气', minor: electricalSub(t), reason: '电气+机械关键词，优先电气' }
  }

  if (brand === 'EIC' || brand === 'TAOBAO' || !brand) {
    if (hit(t, ['气缸', '螺母', '螺钉', 'Q235', '框架', 'STEEL', 'BRACKET'])) {
      return { major: '机械', minor: mechanicalSub(t), reason: '自制件偏机械' }
    }
    if (hit(t, ['CONTROLLER', '电缆', '电源', '传感器'])) {
      return { major: '电气', minor: electricalSub(t), reason: '自制件偏电气' }
    }
    return { major: '机械', minor: MECH_SUB.structure, reason: '自制/外购件默认机械结构' }
  }

  if (elecKw) return { major: '电气', minor: electricalSub(t), reason: '名称偏电气（弱规则）' }
  if (mechKw) return { major: '机械', minor: mechanicalSub(t), reason: '名称偏机械（弱规则）' }

  return { major: '未定义', minor: '未定义', reason: '品牌和名称都不够明确' }
}

function readRows(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  const header = parseCsvLine(lines[0])
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const orderNo = (cols[4] || '').trim()
    if (!orderNo || orderNo.includes('订货号')) continue
    const rec = {
      序号: cols[0] || '',
      层级: cols[1] || '',
      发起人: cols[2] || '',
      询价时间: cols[3] || '',
      订货号: orderNo,
      名称描述: cols[5] || '',
      规格型号: cols[6] || '',
      新名称: cols[7] || '',
      新规格: cols[8] || '',
      是否进采购目录: cols[9] || '',
      起订数量: cols[10] || '',
      单位: cols[11] || '',
      单价: cols[12] || '',
      种类: cols[13] || '',
      品牌: cols[14] || '',
      链接: cols[15] || '',
      后期加入: cols[16] || '',
      货号序列: cols[17] || '',
      停用: cols[18] || '',
    }
    rec.title = rec.新名称 || rec.名称描述
    rec.newTitle = rec.新名称
    rec.oldModel = rec.规格型号
    rec.newSpec = rec.新规格
    rec.brand = rec.品牌
    rec.orderNo = rec.订货号
    const c = classify(rec)
    rec.大类 = c.major
    rec.细类 = c.minor
    rec.分类依据 = c.reason
    rows.push(rec)
  }
  void header
  return rows
}

function addSheet(wb, name, rows, columns) {
  const sheet = wb.addWorksheet(name)
  sheet.columns = columns.map((key) => ({
    header: key,
    key,
    width: key === '名称描述' || key === '规格型号' || key === '分类依据' ? 36 : 16,
  }))
  for (const row of rows) {
    const line = {}
    for (const key of columns) line[key] = row[key] ?? ''
    sheet.addRow(line)
  }
  sheet.getRow(1).font = { bold: true }
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

async function main() {
  const columns = [
    '大类',
    '细类',
    '分类依据',
    '订货号',
    '名称描述',
    '规格型号',
    '新名称',
    '新规格',
    '品牌',
    '单位',
    '是否进采购目录',
    '停用',
    '发起人',
    '询价时间',
  ]

  const rows = readRows(sourcePath)
  const elec = rows.filter((r) => r.大类 === '电气')
  const mech = rows.filter((r) => r.大类 === '机械')
  const unknown = rows.filter((r) => r.大类 === '未定义')

  function countBy(list, key) {
    const m = new Map()
    for (const r of list) m.set(r[key], (m.get(r[key]) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }

  const wb = new ExcelJS.Workbook()
  const summary = wb.addWorksheet('汇总')
  summary.columns = [
    { header: '项目', key: 'k', width: 28 },
    { header: '数量', key: 'v', width: 14 },
  ]
  summary.addRows([
    { k: '源文件行数（不含表头）', v: rows.length },
    { k: '电气', v: elec.length },
    { k: '机械', v: mech.length },
    { k: '未定义', v: unknown.length },
    { k: '停用标记', v: rows.filter((r) => r.停用).length },
  ])
  summary.addRow({})
  summary.addRow({ k: '电气细类', v: '' })
  for (const [name, n] of countBy(elec, '细类')) summary.addRow({ k: name, v: n })
  summary.addRow({})
  summary.addRow({ k: '机械细类', v: '' })
  for (const [name, n] of countBy(mech, '细类')) summary.addRow({ k: name, v: n })
  summary.getRow(1).font = { bold: true }

  addSheet(wb, '电气', elec, columns)
  addSheet(wb, '机械', mech, columns)
  if (unknown.length) addSheet(wb, '未定义', unknown, columns)
  addSheet(wb, '全部', rows, columns)

  await wb.xlsx.writeFile(outPath)
  console.log(JSON.stringify({
    file: outPath,
    total: rows.length,
    电气: elec.length,
    机械: mech.length,
    未定义: unknown.length,
    电气细类: Object.fromEntries(countBy(elec, '细类')),
    机械细类: Object.fromEntries(countBy(mech, '细类')),
  }, null, 2))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
