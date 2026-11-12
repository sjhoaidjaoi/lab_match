package com.college.labselect.service;

import com.college.labselect.dto.req.RoundLockReqDTO;
import com.college.labselect.dto.req.RoundUnlockReqDTO;
import com.college.labselect.dto.req.SnapshotCreateReqDTO;
import com.college.labselect.dto.resp.ResultOverviewVO;
import com.college.labselect.dto.resp.RoundLockRespVO;
import com.college.labselect.dto.resp.RoundUnlockRespVO;
import com.college.labselect.dto.resp.SnapshotCreateRespVO;
import com.college.labselect.entity.Admission;
import com.college.labselect.entity.OperationLog;
import com.college.labselect.entity.Publicity;
import com.college.labselect.entity.RoundSnapshot;
import com.college.labselect.entity.SelectionRound;
import com.college.labselect.entity.SysUser;
import com.college.labselect.exception.BusinessException;
import com.college.labselect.mapper.AdmissionMapper;
import com.college.labselect.mapper.LabMapper;
import com.college.labselect.mapper.MentorProfileMapper;
import com.college.labselect.mapper.OperationLogMapper;
import com.college.labselect.mapper.PublicityMapper;
import com.college.labselect.mapper.RoundSnapshotMapper;
import com.college.labselect.mapper.SelectionRoundMapper;
import com.college.labselect.mapper.SysUserMapper;
import com.college.labselect.service.impl.ArchiveServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 轮次快照与批次归档服务单元测试，阶段 3 以红灯作为阶段 4 的编码边界。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ArchiveServiceTest {

    @Mock
    private SelectionRoundMapper selectionRoundMapper;

    @Mock
    private RoundSnapshotMapper roundSnapshotMapper;

    @Mock
    private AdmissionMapper admissionMapper;

    @Mock
    private PublicityMapper publicityMapper;

    @Mock
    private OperationLogMapper operationLogMapper;

    @Mock
    private SysUserMapper sysUserMapper;

    @Mock
    private LabMapper labMapper;

    @Mock
    private MentorProfileMapper mentorProfileMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private ArchiveServiceImpl archiveService;

    /**
     * 边界：快照类型不在 1–4 范围时返回 400001。
     */
    @Test
    void generateSnapshot_invalidType_shouldThrow400001() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(1L, 1, 5, 0));
        SnapshotCreateReqDTO req = new SnapshotCreateReqDTO();
        req.setSnapshotType(5);

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.generateSnapshot(9001L, 1L, req), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400001);
    }

    /**
     * 边界：轮次不存在时返回 404001。
     */
    @Test
    void generateSnapshot_roundMissing_shouldThrow404001() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.generateSnapshot(9001L, 1L, snapshotReq(4)), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(404001);
    }

    /**
     * 快乐路径：首次生成快照落 version=1、is_current=1 并统计记录数。
     */
    @Test
    void generateSnapshot_firstVersion_shouldInsertCurrentV1() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(1L, 1, 5, 0));
        when(roundSnapshotMapper.selectOne(any())).thenReturn(null);
        when(admissionMapper.selectList(any())).thenReturn(List.of(
                admission(1001L, 1001L, 11L, 2), admission(1002L, 1002L, 12L, 3)));

        SnapshotCreateRespVO result = archiveService.generateSnapshot(9001L, 1L, snapshotReq(4));

        ArgumentCaptor<RoundSnapshot> captor = ArgumentCaptor.forClass(RoundSnapshot.class);
        verify(roundSnapshotMapper).insert(captor.capture());
        RoundSnapshot inserted = captor.getValue();
        assertThat(inserted.getVersion()).isEqualTo(1);
        assertThat(inserted.getIsCurrent()).isEqualTo(1);
        assertThat(inserted.getOperatorId()).isEqualTo(9001L);
        assertThat(inserted.getRecordCount()).isEqualTo(2);
        assertThat(result.getVersion()).isEqualTo(1);
        assertThat(result.getRecordCount()).isEqualTo(2);
    }

    /**
     * 快乐路径：同轮同类型重新生成时旧版本置 is_current=0，新版本 version+1。
     */
    @Test
    void generateSnapshot_sameType_shouldAppendAndRetireOldVersion() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(1L, 1, 5, 0));
        when(roundSnapshotMapper.selectOne(any())).thenReturn(snapshot(2001L, 1L, 4, 2, 1));
        when(admissionMapper.selectList(any())).thenReturn(List.of(admission(1001L, 1001L, 11L, 3)));

        SnapshotCreateRespVO result = archiveService.generateSnapshot(9001L, 1L, snapshotReq(4));

        ArgumentCaptor<RoundSnapshot> oldCaptor = ArgumentCaptor.forClass(RoundSnapshot.class);
        verify(roundSnapshotMapper).updateById(oldCaptor.capture());
        assertThat(oldCaptor.getValue().getId()).isEqualTo(2001L);
        assertThat(oldCaptor.getValue().getIsCurrent()).isEqualTo(0);

        ArgumentCaptor<RoundSnapshot> newCaptor = ArgumentCaptor.forClass(RoundSnapshot.class);
        verify(roundSnapshotMapper).insert(newCaptor.capture());
        assertThat(newCaptor.getValue().getVersion()).isEqualTo(3);
        assertThat(newCaptor.getValue().getIsCurrent()).isEqualTo(1);
        assertThat(result.getVersion()).isEqualTo(3);
    }

    /**
     * 边界：非最后一轮不允许锁定，返回 400002。
     */
    @Test
    void lockRound_notLastRound_shouldThrow400002() {
        when(selectionRoundMapper.selectById(1L)).thenReturn(round(1L, 1, 5, 0));

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.lockRound(9001L, 1L, lockReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：未生成最终归档快照时不允许锁定，返回 400002。
     */
    @Test
    void lockRound_withoutFinalSnapshot_shouldThrow400002() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 0));
        when(roundSnapshotMapper.selectOne(any())).thenReturn(null);

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.lockRound(9001L, 3L, lockReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：公示未确认时不允许锁定，返回 400002。
     */
    @Test
    void lockRound_publicityNotConfirmed_shouldThrow400002() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 0));
        when(roundSnapshotMapper.selectOne(any())).thenReturn(snapshot(2002L, 3L, 4, 1, 1));
        when(publicityMapper.selectOne(any())).thenReturn(publicity(1301L, 2));

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.lockRound(9001L, 3L, lockReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 边界：仍有待确认录取时不允许锁定，返回 400002。
     */
    @Test
    void lockRound_pendingAdmission_shouldThrow400002() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 0));
        when(roundSnapshotMapper.selectOne(any())).thenReturn(snapshot(2002L, 3L, 4, 1, 1));
        when(publicityMapper.selectOne(any())).thenReturn(publicity(1301L, 3));
        when(admissionMapper.selectCount(any())).thenReturn(2L);

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.lockRound(9001L, 3L, lockReq()), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400002);
    }

    /**
     * 快乐路径：锁定置 locked=1 并写操作日志。
     */
    @Test
    void lockRound_success_shouldLockAndLog() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 0));
        when(roundSnapshotMapper.selectOne(any())).thenReturn(snapshot(2002L, 3L, 4, 1, 1));
        when(publicityMapper.selectOne(any())).thenReturn(publicity(1301L, 3));
        when(admissionMapper.selectCount(any())).thenReturn(0L);

        RoundLockRespVO result = archiveService.lockRound(9001L, 3L, lockReq());

        assertThat(result.getLocked()).isEqualTo(1);
        assertThat(result.getLockedAt()).isNotNull();
        verify(selectionRoundMapper).updateById(any(SelectionRound.class));
        verify(operationLogMapper).insert(any(OperationLog.class));
    }

    /**
     * 边界：批次未锁定时解锁返回 400005。
     */
    @Test
    void unlockRound_notLocked_shouldThrow400005() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 0));

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.unlockRound(9001L, 3L, unlockReq("123456")), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(400005);
    }

    /**
     * 边界：管理员密码校验失败返回 401002。
     */
    @Test
    void unlockRound_wrongPassword_shouldThrow401002() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 1));
        when(sysUserMapper.selectById(9001L)).thenReturn(admin("$2a$hash"));
        when(passwordEncoder.matches(eq("wrong"), any())).thenReturn(false);

        BusinessException exception = catchThrowableOfType(
                () -> archiveService.unlockRound(9001L, 3L, unlockReq("wrong")), BusinessException.class);

        assertThat(exception).isNotNull();
        assertThat(exception.getCode()).isEqualTo(401002);
    }

    /**
     * 快乐路径：解锁置 locked=0、公示由已确认退回进行中并写操作日志。
     */
    @Test
    void unlockRound_success_shouldUnlockAndRevertPublicity() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 1));
        when(sysUserMapper.selectById(9001L)).thenReturn(admin("$2a$hash"));
        when(passwordEncoder.matches(eq("123456"), any())).thenReturn(true);
        when(publicityMapper.selectOne(any())).thenReturn(publicity(1301L, 3));

        RoundUnlockRespVO result = archiveService.unlockRound(9001L, 3L, unlockReq("123456"));

        assertThat(result.getLocked()).isEqualTo(0);
        assertThat(result.getUnlockedAt()).isNotNull();
        verify(selectionRoundMapper).updateById(any(SelectionRound.class));
        verify(publicityMapper).updateById(any(Publicity.class));
        verify(operationLogMapper).insert(any(OperationLog.class));
    }

    /**
     * 归档后：总览一律从 is_current=1 且 snapshot_type=4 的快照渲染，不再读实时录取表。
     */
    @Test
    void resultOverview_archived_shouldRenderFromFinalSnapshot() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 1));
        RoundSnapshot snapshot = snapshot(2002L, 3L, 4, 1, 1);
        snapshot.setContent("[{\"studentId\":1001,\"studentNo\":\"20220001\","
                + "\"studentName\":\"陈爱丽\",\"labId\":1,\"mentorId\":11,\"status\":3}]");
        when(roundSnapshotMapper.selectOne(any())).thenReturn(snapshot);

        ResultOverviewVO result = archiveService.resultOverview(3L, null, null, null, null, 1, 10);

        assertThat(result.getArchived()).isEqualTo(1);
        assertThat(result.getPage().getList()).hasSize(1);
        assertThat(result.getPage().getList().get(0).getStudentNo()).isEqualTo("20220001");
        verify(admissionMapper, never()).selectList(any());
    }

    /**
     * 归档前：总览从实时录取表渲染。
     */
    @Test
    void resultOverview_realtime_shouldRenderFromAdmission() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 0));
        when(admissionMapper.selectList(any())).thenReturn(List.of(admission(1001L, 1001L, 11L, 3)));
        when(sysUserMapper.selectBatchIds(any())).thenReturn(List.of(student(1001L)));
        when(labMapper.selectBatchIds(any())).thenReturn(List.of());
        when(mentorProfileMapper.selectBatchIds(any())).thenReturn(List.of());

        ResultOverviewVO result = archiveService.resultOverview(3L, null, null, null, null, 1, 10);

        assertThat(result.getArchived()).isEqualTo(0);
        assertThat(result.getPage().getTotal()).isEqualTo(1);
    }

    /**
     * 快乐路径：导出录取 Excel 返回非空字节流。
     */
    @Test
    void exportResults_shouldReturnNonEmptyBytes() {
        when(selectionRoundMapper.selectById(3L)).thenReturn(round(3L, 3, 5, 1));
        when(roundSnapshotMapper.selectOne(any())).thenReturn(snapshot(2002L, 3L, 4, 1, 1));

        byte[] content = archiveService.exportResults(3L, null, null);

        assertThat(content).isNotEmpty();
    }

    private SnapshotCreateReqDTO snapshotReq(int type) {
        SnapshotCreateReqDTO req = new SnapshotCreateReqDTO();
        req.setSnapshotType(type);
        return req;
    }

    private RoundLockReqDTO lockReq() {
        RoundLockReqDTO req = new RoundLockReqDTO();
        req.setReason("本轮归档锁定");
        return req;
    }

    private RoundUnlockReqDTO unlockReq(String password) {
        RoundUnlockReqDTO req = new RoundUnlockReqDTO();
        req.setReason("需更正录取记录");
        req.setConfirmPassword(password);
        return req;
    }

    private SelectionRound round(Long id, int roundNo, int status, int locked) {
        SelectionRound round = new SelectionRound();
        round.setId(id);
        round.setRoundNo(roundNo);
        round.setStatus(status);
        round.setLocked(locked);
        return round;
    }

    private RoundSnapshot snapshot(Long id, Long roundId, int type, int version, int current) {
        RoundSnapshot snapshot = new RoundSnapshot();
        snapshot.setId(id);
        snapshot.setRoundId(roundId);
        snapshot.setSnapshotType(type);
        snapshot.setVersion(version);
        snapshot.setIsCurrent(current);
        snapshot.setRecordCount(1);
        return snapshot;
    }

    private Publicity publicity(Long id, int status) {
        Publicity publicity = new Publicity();
        publicity.setId(id);
        publicity.setRoundId(3L);
        publicity.setStatus(status);
        return publicity;
    }

    private Admission admission(Long id, Long studentId, Long mentorId, int status) {
        Admission admission = new Admission();
        admission.setId(id);
        admission.setRoundId(3L);
        admission.setStudentId(studentId);
        admission.setLabId(1L);
        admission.setMentorId(mentorId);
        admission.setSourceType(1);
        admission.setStatus(status);
        admission.setTotalScore(new BigDecimal("85.50"));
        return admission;
    }

    private SysUser student(Long id) {
        SysUser user = new SysUser();
        user.setId(id);
        user.setUserNo("20220001");
        user.setRealName("陈爱丽");
        user.setUserType(1);
        user.setCollege("计算机学院");
        user.setMajor("软件工程");
        user.setGrade("2022");
        return user;
    }

    private SysUser admin(String password) {
        SysUser user = new SysUser();
        user.setId(9001L);
        user.setUserNo("admin");
        user.setRealName("系统管理员");
        user.setUserType(3);
        user.setPassword(password);
        return user;
    }
}
