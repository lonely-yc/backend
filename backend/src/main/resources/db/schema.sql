-- =============================================
-- 数字族谱系统 数据库建表脚本
-- =============================================

CREATE DATABASE IF NOT EXISTS genealogy
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE genealogy;

-- 用户表
CREATE TABLE IF NOT EXISTS t_user (
  id            BIGINT       PRIMARY KEY COMMENT '主键ID',
  username      VARCHAR(50)  NOT NULL UNIQUE COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  display_name  VARCHAR(50)  NOT NULL COMMENT '显示名称',
  role          VARCHAR(20)  NOT NULL DEFAULT 'USER' COMMENT '角色: ADMIN/USER',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 姓氏家族表
CREATE TABLE IF NOT EXISTS t_family (
  id            BIGINT       PRIMARY KEY COMMENT '主键ID',
  surname       VARCHAR(50)  NOT NULL COMMENT '姓氏',
  description   VARCHAR(500) DEFAULT NULL COMMENT '家族描述',
  avatar_url    VARCHAR(255) DEFAULT NULL COMMENT '家族头像',
  member_count  INT          NOT NULL DEFAULT 0 COMMENT '成员数(冗余)',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_surname (surname)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='姓氏家族表';

-- 人物表
CREATE TABLE IF NOT EXISTS t_person (
  id            BIGINT       PRIMARY KEY COMMENT '主键ID',
  family_id     BIGINT       DEFAULT NULL COMMENT '所属家族ID',
  name          VARCHAR(50)  NOT NULL COMMENT '姓名',
  gender        VARCHAR(10)  NOT NULL DEFAULT 'male' COMMENT '性别: male/female',
  generation    INT          NOT NULL DEFAULT 1 COMMENT '世代编号',
  birth_date    VARCHAR(20)  DEFAULT NULL COMMENT '出生日期',
  death_date    VARCHAR(20)  DEFAULT NULL COMMENT '去世日期',
  birth_place   VARCHAR(100) DEFAULT NULL COMMENT '出生地',
  bio           TEXT         DEFAULT NULL COMMENT '人物简介',
  avatar_url    VARCHAR(255) DEFAULT NULL COMMENT '头像路径',
  is_starred    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否重点人物',
  deleted       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_generation (generation),
  INDEX idx_name (name),
  INDEX idx_family (family_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人物表';

-- 亲缘关系表
CREATE TABLE IF NOT EXISTS t_relation (
  id            BIGINT       PRIMARY KEY COMMENT '主键ID',
  from_id       BIGINT       NOT NULL COMMENT '起始人物ID',
  to_id         BIGINT       NOT NULL COMMENT '目标人物ID',
  type          VARCHAR(20)  NOT NULL COMMENT '关系类型: parent-child/spouse/adopted',
  deleted       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_from (from_id),
  INDEX idx_to (to_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='亲缘关系表';

-- 人物事件表
CREATE TABLE IF NOT EXISTS t_event (
  id            BIGINT       PRIMARY KEY COMMENT '主键ID',
  person_id     BIGINT       NOT NULL COMMENT '所属人物ID',
  type          VARCHAR(20)  NOT NULL DEFAULT 'other' COMMENT '事件类型: birth/death/marriage/migration/achievement/residence/other',
  title         VARCHAR(100) NOT NULL COMMENT '事件标题',
  event_date    VARCHAR(20)  DEFAULT NULL COMMENT '事件日期',
  description   TEXT         DEFAULT NULL COMMENT '事件描述',
  location      VARCHAR(255) DEFAULT NULL COMMENT '地点名称',
  latitude      DOUBLE       DEFAULT NULL COMMENT '纬度',
  longitude     DOUBLE       DEFAULT NULL COMMENT '经度',
  deleted       TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '逻辑删除',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_person (person_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='人物事件表';

-- 操作日志表
CREATE TABLE IF NOT EXISTS t_operate_log (
  id                  BIGINT       PRIMARY KEY COMMENT '主键ID',
  operate_type        VARCHAR(50)  NOT NULL COMMENT '操作类型',
  operate_type_desc   VARCHAR(100) NOT NULL COMMENT '操作类型描述',
  user_id             BIGINT       DEFAULT NULL COMMENT '操作人ID',
  user_name           VARCHAR(50)  DEFAULT NULL COMMENT '操作人名称',
  target_id           BIGINT       DEFAULT NULL COMMENT '关联对象ID',
  target_name         VARCHAR(100) DEFAULT NULL COMMENT '关联对象名称',
  target_type         VARCHAR(20)  DEFAULT NULL COMMENT '对象类型: PERSON/RELATION/EVENT/FAMILY',
  family_id           BIGINT       DEFAULT NULL COMMENT '家族ID',
  detail              TEXT         DEFAULT NULL COMMENT '操作详情(JSON格式)',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
  INDEX idx_family (family_id),
  INDEX idx_user (user_id),
  INDEX idx_target (target_id),
  INDEX idx_operate_type (operate_type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';
