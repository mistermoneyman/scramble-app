import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, SectionLabel, type IconName } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useNow } from '@/hooks/useNow';
import { academicYearLabel } from '@/lib/academicYear';
import { confirm } from '@/lib/confirm';
import { formatDate, formatMoney } from '@/lib/format';
import { auditKey, isOfficer, yearReport } from '@/lib/orgRules';
import { isMember } from '@/lib/selectors';
import { ME, submitAudit, useAppState } from '@/lib/store';

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const state = useAppState();
  const now = useNow();
  const org = state.orgs.find((candidate) => candidate.id === id);

  if (!org || !isMember(org)) {
    return <EmptyState icon="lock-closed-outline" title="Only members can see this" />;
  }

  const report = yearReport(state, org.id, now);
  const audit = state.audits[auditKey(org.id, report.start)];
  const spending = report.transactions.filter((t) => t.direction === 'out');
  const approved = spending.filter((t) => t.method === 'request').length;
  const card = spending.filter((t) => t.method === 'card').length;
  const maxCategory = Math.max(1, ...report.spendByCategory.map(([, amount]) => amount));
  const partnerShare = report.moneyOut ? Math.round((report.partnerSpend / report.moneyOut) * 100) : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Year-end report' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>
          {org.name} · {academicYearLabel(report.start)}
        </Text>
        <Text style={styles.muted}>
          {formatDate(report.start)} – {formatDate(Math.min(now, report.end - 1))}. Built from every
          transaction in your university account, so there&apos;s nothing to fill out by hand.
        </Text>

        <Card style={styles.summary}>
          <Line label="Opening balance" value={formatMoney(report.opening)} />
          <Line label="Money in" value={`+${formatMoney(report.moneyIn)}`} tone="in" />
          <Line label="Money out" value={`−${formatMoney(report.moneyOut)}`} />
          <View style={styles.divider} />
          <Line label="Current balance" value={formatMoney(report.closing)} bold />
        </Card>

        <SectionLabel>Where money came from</SectionLabel>
        {report.incomeBySource.map(([source, amount]) => (
          <Line key={source} label={source} value={formatMoney(amount)} />
        ))}

        <SectionLabel>Where it went</SectionLabel>
        {report.spendByCategory.length === 0 && <Text style={styles.muted}>No spending yet.</Text>}
        {report.spendByCategory.map(([category, amount]) => (
          <View key={category} style={styles.bar}>
            <View style={styles.barTop}>
              <Text style={styles.label}>{category}</Text>
              <Text style={styles.value}>{formatMoney(amount)}</Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(amount / maxCategory) * 100}%` }]} />
            </View>
          </View>
        ))}

        <SectionLabel>Controls</SectionLabel>
        <Card style={styles.controls}>
          <Control
            icon="people-circle-outline"
            text={`${approved} ${approved === 1 ? 'payment' : 'payments'} signed by every officer`}
          />
          <Control
            icon="card-outline"
            text={`${card} card ${card === 1 ? 'purchase' : 'purchases'} within the monthly limit`}
          />
          <Control
            icon="storefront-outline"
            text={`${partnerShare}% of spending went to university partners`}
          />
          <Control icon="eye-outline" text="Student Activities can see this ledger in real time" />
        </Card>

        {audit ? (
          <View style={styles.submitted}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.submittedText}>
              Submitted by {audit.submittedBy === ME ? 'you' : state.users[audit.submittedBy]?.name}{' '}
              on {formatDate(audit.submittedAt)}
            </Text>
          </View>
        ) : (
          isOfficer(org) && (
            <Button
              label="Submit to Student Activities"
              icon="send-outline"
              style={styles.submit}
              onPress={() =>
                confirm(
                  'Submit this report?',
                  'You are certifying that this ledger is complete for the year.',
                  'Submit',
                  () => submitAudit(org.id),
                )
              }
            />
          )
        )}
      </ScrollView>
    </>
  );
}

function Line({
  label,
  value,
  tone,
  bold,
}: {
  label: string;
  value: string;
  tone?: 'in';
  bold?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={[styles.label, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.value, tone === 'in' && styles.in, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

function Control({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.control}>
      <Ionicons name={icon} size={20} color={colors.success} />
      <Text style={styles.controlText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  summary: {
    marginTop: 16,
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  label: {
    color: colors.text,
    fontSize: 15,
  },
  value: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  in: {
    color: colors.success,
  },
  bold: {
    fontWeight: '800',
    fontSize: 17,
  },
  bar: {
    gap: 6,
    marginBottom: 10,
  },
  barTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  controls: {
    gap: 12,
  },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  controlText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  submit: {
    marginTop: 20,
  },
  submitted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginTop: 20,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  submittedText: {
    flex: 1,
    color: colors.text,
    fontWeight: '700',
  },
});
