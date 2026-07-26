package com.hiikky.organization;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class OrganizationDAO {

    public boolean saveOrganization(Organization organization) {

        String sql = """
               
                INSERT INTO organizations
                (organization_name,
                 organization_owner,
                 email,
                 phone,
                 address,
                 status)
                VALUES (?, ?, ?, ?, ?, ?)
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
                )
        {
            preparedStatement.setString(1, organization.getOrganizationName());
            preparedStatement.setString(2, organization.getOrganizationOwner());
            preparedStatement.setString(3, organization.getEmail());
            preparedStatement.setString(4, organization.getPhone());
            preparedStatement.setString(5, organization.getAddress());
            preparedStatement.setString(6, organization.getStatus());

            int row = preparedStatement.executeUpdate();

            return row > 0;
        }
        catch(SQLException e){
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
            return false;
        }
        }
    }