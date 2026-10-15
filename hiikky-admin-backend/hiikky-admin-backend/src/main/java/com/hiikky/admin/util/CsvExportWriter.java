package com.hiikky.admin.util;

import java.io.IOException;
import java.io.Writer;
import java.util.List;

public final class CsvExportWriter {

    private CsvExportWriter() {
    }

    public static void writeRow(Writer writer, List<?> values) throws IOException {
        for (int index = 0; index < values.size(); index++) {
            if (index > 0) {
                writer.write(',');
            }
            String value = values.get(index) == null ? "" : values.get(index).toString();
            writer.write('"');
            writer.write(escape(value));
            writer.write('"');
        }
        writer.write("\r\n");
    }

    private static String escape(String value) {
        int firstContentCharacter = 0;
        while (firstContentCharacter < value.length()
                && (Character.isWhitespace(value.charAt(firstContentCharacter))
                || Character.isISOControl(value.charAt(firstContentCharacter)))) {
            firstContentCharacter++;
        }
        if (firstContentCharacter < value.length()
                && "=+-@".indexOf(value.charAt(firstContentCharacter)) >= 0) {
            value = "'" + value;
        }
        return value.replace("\"", "\"\"");
    }
}
