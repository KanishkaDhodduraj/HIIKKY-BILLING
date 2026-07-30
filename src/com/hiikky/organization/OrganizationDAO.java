package com.hiikky.organization;

import com.hiikky.database.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.List;

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
        ) {
            preparedStatement.setString(1, organization.getOrganizationName());
            preparedStatement.setString(2, organization.getOrganizationOwner());
            preparedStatement.setString(3, organization.getEmail());
            preparedStatement.setString(4, organization.getPhone());
            preparedStatement.setString(5, organization.getAddress());
            preparedStatement.setString(6, organization.getStatus());

            int row = preparedStatement.executeUpdate();

            return row > 0;
        } catch (SQLException e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
            return false;
        }
    }

    public List<Organization> getAllOrganizations() {

        List<Organization> organizations = new ArrayList<>();

        String sql = """
                SELECT
                    organization_id,
                    organization_name,
                    organization_owner,
                    email,
                    phone,
                    address,
                    status
                FROM organizations
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql);
                ResultSet resultSet = preparedStatement.executeQuery();
        ) {

            while (resultSet.next()) {

                Organization organization = new Organization();

                organization.setOrganizationId(resultSet.getInt("organization_id"));
                organization.setOrganizationName(resultSet.getString("organization_name"));
                organization.setOrganizationOwner(resultSet.getString("organization_owner"));
                organization.setEmail(resultSet.getString("email"));
                organization.setPhone(resultSet.getString("phone"));
                organization.setAddress(resultSet.getString("address"));
                organization.setStatus(resultSet.getString("status"));

                organizations.add(organization);
            }
        } catch (SQLException e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
        }

        return organizations;
    }


    public boolean updateOrganization(Organization organization) {

        String sql = """
                UPDATE organizations
                SET organization_name = ?,
                 organization_owner = ?,
                 email = ?,
                 phone = ?,
                 address = ?,
                 status = ?
                 WHERE organization_id = ?
                """;

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {
            preparedStatement.setString(1, organization.getOrganizationName());
            preparedStatement.setString(2, organization.getOrganizationOwner());
            preparedStatement.setString(3, organization.getEmail());
            preparedStatement.setString(4, organization.getPhone());
            preparedStatement.setString(5, organization.getAddress());
            preparedStatement.setString(6, organization.getStatus());
            preparedStatement.setInt(7, organization.getOrganizationId());

            int row = preparedStatement.executeUpdate();

            return row > 0;
        } catch (SQLException e) {
            System.out.println("Database Error Occurs");
            System.out.println(e.getMessage());
            return false;
        }
    }

    public boolean deleteOrganization(int organizationId) {

        String sql = "DELETE FROM organizations WHERE organization_id = ?";

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {
            preparedStatement.setInt(1, organizationId);

            int row = preparedStatement.executeUpdate();

            return row > 0;
        } catch (SQLException e) {
            System.out.println("SQL Exception Occurs");
            System.out.println(e.getMessage());
            return false;
        }
    }

    public Organization searchOrganizationById(int organizationId) {

        String sql = "SELECT * FROM organizations WHERE organization_id = ?";

        try (
                Connection con = DBConnection.getConnection();
                PreparedStatement preparedStatement = con.prepareStatement(sql)
        ) {
            preparedStatement.setInt(1, organizationId);
            ResultSet resultSet = preparedStatement.executeQuery();

            if (resultSet.next()) {

                Organization organization = new Organization();

                organization.setOrganizationId(resultSet.getInt("organization_id"));
                organization.setOrganizationName(resultSet.getString("organization_name"));
                organization.setOrganizationOwner(resultSet.getString("organization_owner"));
                organization.setEmail(resultSet.getString("email"));
                organization.setPhone(resultSet.getString("phone"));
                organization.setAddress(resultSet.getString("address"));
                organization.setStatus(resultSet.getString("status"));

                return organization;
            }
        } catch (SQLException e) {
            System.out.println(e.getMessage());
        }

        return null;
    }
}