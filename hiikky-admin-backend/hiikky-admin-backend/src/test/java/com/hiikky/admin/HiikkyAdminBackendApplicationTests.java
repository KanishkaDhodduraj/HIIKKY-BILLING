package com.hiikky.admin;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
class HiikkyAdminBackendApplicationTests {

	@Autowired
	private DataSource dataSource;

	@Test
	void contextLoads() throws SQLException {
		assertNotNull(dataSource, "DataSource bean should be loaded in application context");
		try (Connection connection = dataSource.getConnection()) {
			String databaseProductName = connection.getMetaData().getDatabaseProductName();
			System.out.println("Active Test Database Product: " + databaseProductName);
			assertTrue(databaseProductName.equalsIgnoreCase("H2"), "Test should use H2 in-memory database");
		}
	}

}
