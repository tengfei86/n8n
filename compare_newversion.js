incomeRecords =
    [
        {
            "汇总月份": "202403",
            "身份证号码": "110106197211293028",
            "纳税人收入额": "1833.60",
            "标记_发票状态": "",
            "发票号码": null,
            "清理状态": "open",
            "清理日期": null
        },
        {
            "汇总月份": "202405",
            "身份证号码": "110106197211293028",
            "纳税人收入额": "600.00",
            "标记_发票状态": "",
            "发票号码": null,
            "清理状态": "open",
            "清理日期": null
        },
        {
            "汇总月份": "202406",
            "身份证号码": "110106197211293028",
            "纳税人收入额": "600.60",
            "标记_发票状态": "",
            "发票号码": null,
            "清理状态": "open",
            "清理日期": null
        },
        {
            "汇总月份": "202412",
            "身份证号码": "210106197211293028",
            "纳税人收入额": "1000.00",
            "标记_发票状态": "",
            "发票号码": null,
            "清理状态": "open",
            "清理日期": null
        }
    ]


invoiceRecords =
    [
        {
            "invoice_number": "24112000000128367880 ",
            "seller_tax_id": "110106197211293028",
            "cleanup_status": "open",
            "cleanup_date": null,
            "发票总金额": "1200.60",
            "已报销金额": "0.00",
            "剩余金额": "1200.60"
        },
        {
            "invoice_number": "24112000000128367881",
            "seller_tax_id": "110106197211293028",
            "cleanup_status": "open",
            "cleanup_date": null,
            "发票总金额": "1833.60",
            "已报销金额": "0.00",
            "剩余金额": "1833.60"
        },
        {
            "invoice_number": "24112000000128367882",
            "seller_tax_id": "210106197211293028",
            "cleanup_status": "open",
            "cleanup_date": null,
            "发票总金额": "1001.00",
            "已报销金额": "0.00",
            "剩余金额": "1001.00"
        }

    ]

// 格式化日期为 'YYYY-MM-DD' 格式
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');  // 月份从 0 开始，所以加 1
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 按身份证号码（或其他唯一标识符）对记录进行分组
function groupBy(records, key) {
    return records.reduce((result, record) => {
        const groupKey = record[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(record);
        return result;
    }, {});
}

function canMatchIncomeToInvoice(incomes, invoices) {
    const formattedDate = formatDate(new Date());
    // 用于递归的辅助函数
    function canForm(target, invoices) {
        // 目标值是0时，说明成功找到组合
        if (target === 0) return true;
        // 目标值小于0时，说明当前组合不可能
        if (target < 0) return false;

        // 遍历可用的数
        for (let i = 0; i < invoices.length; i++) {
            if (invoices[i].cleanup_status != "closed") { // 只使用未使用过的数字
                invoices[i].cleanup_status = "closed"; // 标记为已使用
                if (canForm(parseFloat((target - parseFloat(invoices[i].发票总金额)).toFixed(2)), invoices)) return true; // 递归检查
                invoices[i].cleanup_status = "open";  // 回溯
            }
        }
        return false;
    }

    // 检查arr1中的每一个元素是否能通过arr2的组合来形成
    for (let income of incomes) {
        if (income.清理状态 != "closed") {
            let incomeAmount = parseFloat(income.纳税人收入额);
            if (incomeAmount > 500) {
                if (!canForm(incomeAmount, invoices)) {
                    return false; // 如果任意一个数不能匹配，则返回false
                } else {
                    income.清理状态 = 'closed';
                    income.清理日期 = formattedDate;
                }
            } else {
                income.清理状态 = 'closed';
                income.清理日期 = formattedDate;
            }
        }

    }

    return true; // 所有数都匹配时返回true
}

function canMatchInvoiceToIncome(invoices, incomes) {
    const formattedDate = formatDate(new Date());
    // 用于递归的辅助函数
    function canForm(target, incomes) {
        // 目标值是0时，说明成功找到组合
        if (target === 0) return true;
        // 目标值小于0时，说明当前组合不可能
        if (target < 0) return false;

        // 遍历可用的数
        for (let i = 0; i < incomes.length; i++) {
            if (incomes[i].清理状态 != "closed") { // 只使用未使用过的数字
                incomes[i].清理状态 = "closed"; // 标记为已使用
                if (canForm(parseFloat((target - parseFloat(incomes[i].纳税人收入额)).toFixed(2)), incomes)) return true; // 递归检查
                incomes[i].清理状态 = "open";  // 回溯
            }
        }
        return false;
    }

    // 检查arr1中的每一个元素是否能通过arr2的组合来形成
    for (let invoice of invoices) {
        let invoiceAmount = parseFloat(invoice.发票总金额);
        if (invoice.cleanup_status != "closed") {
            if (!canForm(invoiceAmount, incomes)) {
                return false; // 如果任意一个数不能匹配，则返回false
            } else {
                invoice.cleanup_status = "closed";
                invoice.cleanup_date = formattedDate;
            }
        }
    }
    return true; // 所有数都匹配时返回true
}
// 分别对收入记录和发票记录进行分组
const incomeGroups = groupBy(incomeRecords, '身份证号码');
const invoiceGroups = groupBy(invoiceRecords, 'seller_tax_id');
// 处理每个人的数据
for (let personId in incomeGroups) {
    const incomes = incomeGroups[personId] || [];
    const invoices = invoiceGroups[personId] || [];
    canMatchIncomeToInvoice(incomes, invoices);
    canMatchInvoiceToIncome(invoices, incomes);
    console.log(incomes);
}
