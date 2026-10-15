package com.hiikky.admin.repository;

import com.hiikky.admin.model.NotificationDispatch;
import com.hiikky.admin.model.NotificationSearchCriteria;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository {

    List<NotificationDispatch> findAll(NotificationSearchCriteria criteria);

    long count(NotificationSearchCriteria criteria);

    Optional<NotificationDispatch> findById(Long id);
}
