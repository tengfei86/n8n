// 格式化日期为 'YYYY-MM-DD' 格式
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');  // 月份从 0 开始，所以加 1
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 从 n8n 查询节点中获取数据
// let incomeRecordsSets = $items("查询兼职人员收入清单数据");  // 动态获取收入清单数据
// let invoicesSets = $items("发票信息查询");  // 动态获取发票数据

// incomeRecordsSets = [
//     { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-09" } },
//     { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-10" } },
//     { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-11" } },
//   ];
//   invoicesSets = [
//     { json: { "seller_tax_id": "123456", "invoice_number": "INV-001", "剩余金额": "2000", "已报销金额": "0" } },
//     { json: { "seller_tax_id": "123456", "invoice_number": "INV-002", "剩余金额": "500", "已报销金额": "0" } }

//   ];

// incomeRecordsSets = [
//     { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-09" } },
//   ];
//   invoicesSets = [
//     { json: { "seller_tax_id": "123456", "invoice_number": "INV-001", "剩余金额": "1001", "已报销金额": "0" } },

//   ];

incomeRecordsSets = [
    { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-09" } },
    { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-10" } },
    { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-11" } },
  ];
  invoicesSets = [
    { json: { "seller_tax_id": "123456", "invoice_number": "INV-001", "剩余金额": "2000", "已报销金额": "0" } },
    { json: { "seller_tax_id": "123456", "invoice_number": "INV-002", "剩余金额": "1000", "已报销金额": "0" } }

  ];

incomeRecordsSets = [
    { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-09" } },
    { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-10" } },
    { json: { "身份证号码": "123456", "纳税人收入额": "1000", "汇总月份": "2024-11" } },
  ];
  invoicesSets = [
    { json: { "seller_tax_id": "123456", "invoice_number": "INV-001", "剩余金额": "2000", "已报销金额": "0" } },
  ];

// 将获取到的 json 数据映射为数组
let incomeRecords = incomeRecordsSets.map(record => record.json);
let invoices = invoicesSets.map(invoice => invoice.json);

// 获取当前日期
const formattedDate = formatDate(new Date());

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

// 分别对收入记录和发票记录进行分组
const incomeGroups = groupBy(incomeRecords, '身份证号码');
const invoiceGroups = groupBy(invoices, 'seller_tax_id');

// 定义处理函数，根据个人的收入和发票数据进行处理
function processIncomeAndInvoices(incomeSet, invoiceSet) {
    let currentInvoiceIndex = 0;
    let matchedIncomeRecords = [];

    incomeSet.forEach((record, index) => {
        let incomeAmount = parseFloat(record.纳税人收入额);

        if (incomeAmount <= 500) {
            record.标记_发票状态 = '未达起征点';
            record.清理状态 = 'closed';
            record.清理日期 = formattedDate;
            console.log(`收入记录 ${index + 1} (身份证号码: ${record.身份证号码}) 标记为未达起征点`);
            return;
        }

        while (incomeAmount > 0 && currentInvoiceIndex < invoiceSet.length) {
            let invoice = invoiceSet[currentInvoiceIndex];
            let remainingAmount = parseFloat(invoice.剩余金额);

            if (remainingAmount >= incomeAmount) {
                remainingAmount -= incomeAmount;
                invoice.已报销金额 = (parseFloat(invoice.已报销金额) + incomeAmount).toFixed(2);
                invoice.剩余金额 = remainingAmount.toFixed(2);
                matchedIncomeRecords.push(record);

                if (remainingAmount === 0) {
                    matchedIncomeRecords.forEach((matchedRecord) => {
                        matchedRecord.标记_发票状态 = '已开票';
                        matchedRecord.发票号码 = invoice.invoice_number;
                        matchedRecord.清理状态 = 'closed';
                        matchedRecord.清理日期 = formattedDate;
                        console.log(`更新收入记录 (${matchedRecord.汇总月份}) 为 closed`);
                    });

                    invoice.cleanup_status = 'closed';
                    invoice.cleanup_date = formattedDate;
                    matchedIncomeRecords = [];

                    for(index = 0;index< currentInvoiceIndex;index++){
                       invoice_temp = invoiceSet[index] ;
                       if (parseFloat(invoice_temp.剩余金额) === 0 && invoice_temp.cleanup_status != "closed") {
                          invoice_temp.cleanup_status = 'closed';
                          invoice_temp.cleanup_date = formattedDate;                
                       }
                    }
                }

                incomeAmount = 0;
            } else {
                incomeAmount -= remainingAmount;
                invoice.已报销金额 = (parseFloat(invoice.已报销金额) + remainingAmount).toFixed(2);
                invoice.剩余金额 = '0.00';

                currentInvoiceIndex++;
                if (currentInvoiceIndex < invoiceSet.length) {
                    remainingAmount = parseFloat(invoiceSet[currentInvoiceIndex].剩余金额);
                }
            }
        }
    });

    invoiceSet.forEach(invoice => {
         if(invoice.cleanup_status != "closed")
         {
            invoice.剩余金额 =  parseFloat(invoice.已报销金额 + invoice.剩余金额).toFixed();
            invoice.已报销金额 = 0;
            invoice.cleanup_status = 'open';
            console.log(`发票 ${invoice.invoice_number} 部分使用，状态保持 open`);
        }
    });
}

// 处理每个人的数据
for (let personId in incomeGroups) {
    const incomes = incomeGroups[personId] || [];
    const invoices = invoiceGroups[personId] || [];

    processIncomeAndInvoices(incomes, invoices);
}

// 输出最终结果
console.log("更新后的收入清单:", JSON.stringify(incomeRecords, null, 2));
console.log("更新后的发票数据:", JSON.stringify(invoices, null, 2));

// 返回处理后的收入清单和发票列表
return { incomeRecords, invoices };
