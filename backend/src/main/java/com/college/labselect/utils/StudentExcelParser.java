package com.college.labselect.utils;

import cn.hutool.core.util.NumberUtil;
import cn.hutool.core.util.StrUtil;
import com.college.labselect.common.ResultCode;
import com.college.labselect.exception.BusinessException;
import lombok.Data;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 学生导入 Excel（.xlsx）解析器，仅依赖 JDK 解析 OOXML，避免引入额外三方库。
 */
@Component
public class StudentExcelParser {

    private static final int COLUMN_COUNT = 7;
    private static final String SHEET_PREFIX = "xl/worksheets/sheet";
    private static final String SHARED_STRINGS = "xl/sharedStrings.xml";

    /**
     * 解析学生导入文件，首行视为表头跳过。
     *
     * @param file Excel 文件
     * @return 数据行列表，列顺序：学号、姓名、学院、专业、年级、手机号、邮箱
     */
    public List<Row> parse(MultipartFile file) {
        List<RawRow> rawRows = parseRaw(file, COLUMN_COUNT);
        List<Row> result = new ArrayList<>(rawRows.size());
        for (RawRow rawRow : rawRows) {
            result.add(toRow(rawRow));
        }
        return result;
    }

    /**
     * 通用解析 xlsx 数据行，首行视为表头跳过。
     *
     * @param file        Excel 文件
     * @param columnCount 读取列数
     * @return 原始数据行
     */
    public List<RawRow> parseRaw(MultipartFile file, int columnCount) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "请选择要导入的 Excel 文件");
        }
        String fileName = file.getOriginalFilename();
        if (StrUtil.isBlank(fileName) || !fileName.toLowerCase().endsWith(".xlsx")) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "仅支持 .xlsx 格式文件");
        }
        try (InputStream inputStream = file.getInputStream()) {
            Map<String, byte[]> entries = readEntries(inputStream);
            byte[] sheet = entries.entrySet().stream()
                    .filter(entry -> entry.getKey().startsWith(SHEET_PREFIX))
                    .map(Map.Entry::getValue)
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ResultCode.PARAM_ERROR, "Excel 缺少工作表"));
            List<String> sharedStrings = entries.containsKey(SHARED_STRINGS)
                    ? parseSharedStrings(entries.get(SHARED_STRINGS))
                    : List.of();
            return parseSheet(sheet, sharedStrings, columnCount);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ResultCode.PARAM_ERROR, "Excel 解析失败");
        }
    }

    /**
     * 读取压缩包内的 worksheet 与共享字符串。
     *
     * @param inputStream 文件流
     * @return 条目名与内容的映射
     * @throws Exception 读取异常
     */
    private Map<String, byte[]> readEntries(InputStream inputStream) throws Exception {
        Map<String, byte[]> entries = new HashMap<>();
        try (ZipInputStream zip = new ZipInputStream(inputStream)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                String name = entry.getName();
                if (name.startsWith(SHEET_PREFIX) || SHARED_STRINGS.equals(name)) {
                    entries.put(name, zip.readAllBytes());
                }
                zip.closeEntry();
            }
        }
        return entries;
    }

    /**
     * 解析共享字符串表。
     *
     * @param content XML 内容
     * @return 字符串列表
     * @throws Exception 解析异常
     */
    private List<String> parseSharedStrings(byte[] content) throws Exception {
        NodeList items = newDocument(content).getElementsByTagName("si");
        List<String> strings = new ArrayList<>(items.getLength());
        for (int i = 0; i < items.getLength(); i++) {
            NodeList texts = ((Element) items.item(i)).getElementsByTagName("t");
            StringBuilder builder = new StringBuilder();
            for (int j = 0; j < texts.getLength(); j++) {
                builder.append(texts.item(j).getTextContent());
            }
            strings.add(builder.toString());
        }
        return strings;
    }

    /**
     * 解析首个工作表的数据行。
     *
     * @param content       XML 内容
     * @param sharedStrings 共享字符串表
     * @param columnCount   读取列数
     * @return 原始数据行
     * @throws Exception 解析异常
     */
    private List<RawRow> parseSheet(byte[] content, List<String> sharedStrings, int columnCount) throws Exception {
        NodeList rows = newDocument(content).getElementsByTagName("row");
        List<RawRow> result = new ArrayList<>();
        for (int i = 1; i < rows.getLength(); i++) {
            Element rowElement = (Element) rows.item(i);
            String[] values = new String[columnCount];
            NodeList cells = rowElement.getElementsByTagName("c");
            for (int j = 0; j < cells.getLength(); j++) {
                Element cell = (Element) cells.item(j);
                int index = columnIndex(cell.getAttribute("r"));
                if (index >= 0 && index < columnCount) {
                    values[index] = readCell(cell, sharedStrings);
                }
            }
            if (StrUtil.isAllBlank(values)) {
                continue;
            }
            RawRow row = new RawRow();
            String rowNo = rowElement.getAttribute("r");
            row.setRowNo(NumberUtil.isInteger(rowNo) ? Integer.parseInt(rowNo) : 0);
            row.setValues(values);
            result.add(row);
        }
        return result;
    }

    /**
     * 读取单元格文本。
     *
     * @param cell          单元格节点
     * @param sharedStrings 共享字符串表
     * @return 单元格文本，空值返回 null
     */
    private String readCell(Element cell, List<String> sharedStrings) {
        String type = cell.getAttribute("t");
        if ("inlineStr".equals(type)) {
            NodeList texts = cell.getElementsByTagName("t");
            return texts.getLength() > 0 ? StrUtil.trimToNull(texts.item(0).getTextContent()) : null;
        }
        NodeList values = cell.getElementsByTagName("v");
        if (values.getLength() == 0) {
            return null;
        }
        String value = StrUtil.trimToNull(values.item(0).getTextContent());
        if (!"s".equals(type) || value == null) {
            return value;
        }
        if (!NumberUtil.isInteger(value)) {
            return null;
        }
        int index = Integer.parseInt(value);
        return index >= 0 && index < sharedStrings.size() ? StrUtil.trimToNull(sharedStrings.get(index)) : null;
    }

    /**
     * 将单元格引用（如 B3）转换为从 0 开始的列下标。
     *
     * @param reference 单元格引用
     * @return 列下标，无法识别返回 -1
     */
    private int columnIndex(String reference) {
        if (StrUtil.isBlank(reference)) {
            return -1;
        }
        int index = 0;
        for (char ch : reference.toCharArray()) {
            if (ch < 'A' || ch > 'Z') {
                break;
            }
            index = index * 26 + (ch - 'A' + 1);
        }
        return index - 1;
    }

    /**
     * 组装学生数据行。
     *
     * @param rawRow 原始数据行
     * @return 学生数据行
     */
    private Row toRow(RawRow rawRow) {
        String[] values = rawRow.getValues();
        Row row = new Row();
        row.setRowNo(rawRow.getRowNo());
        row.setUserNo(values[0]);
        row.setRealName(values[1]);
        row.setCollege(values[2]);
        row.setMajor(values[3]);
        row.setGrade(values[4]);
        row.setPhone(values[5]);
        row.setEmail(values[6]);
        return row;
    }

    /**
     * 构建关闭外部实体的 DOM 文档。
     *
     * @param content XML 内容
     * @return DOM 文档
     * @throws Exception 解析异常
     */
    private Document newDocument(byte[] content) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        return factory.newDocumentBuilder().parse(new ByteArrayInputStream(content));
    }

    /**
     * 原始数据行。
     */
    @Data
    public static class RawRow {

        private Integer rowNo;
        private String[] values;
    }

    /**
     * 学生导入数据行。
     */
    @Data
    public static class Row {

        private Integer rowNo;
        private String userNo;
        private String realName;
        private String college;
        private String major;
        private String grade;
        private String phone;
        private String email;
    }
}
